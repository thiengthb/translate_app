package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.menu.module.Module;
import com.example.starter_project_2025.system.menu.module.ModuleRepository;
import com.example.starter_project_2025.system.menu.module_groups.ModuleGroup;
import com.example.starter_project_2025.system.menu.module_groups.ModuleGroupRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Order(11)
@Component
@RequiredArgsConstructor
public class StudentMenuInitializer implements CommandLineRunner {

    private final ModuleRepository moduleRepository;
    private final ModuleGroupRepository groupRepository;

    @Override
    @Transactional
    public void run(String... args) {
        ModuleGroup learningGroup = getOrCreateGroup("Learning", 10);

        upsertModule(learningGroup, "My Library", "/library",   "layers", 1, "FOLDER_READ");
        upsertModule(learningGroup, "Community",  "/community", "users",  2, "DECK_READ");

        // Create Deck is no longer a sidebar entry — it lives as a button inside the Library page.
        moduleRepository.findByUrl("/create-deck").ifPresent(moduleRepository::delete);

        log.info("Student menu entries ensured: /library, /community");
    }

    private void upsertModule(ModuleGroup group, String title, String url, String icon, int order, String permission) {
        Module module = moduleRepository.findByUrl(url).orElseGet(Module::new);

        module.setModuleGroup(group);
        module.setTitle(title);
        module.setUrl(url);
        module.setIcon(icon);
        module.setDisplayOrder(order);
        module.setRequiredPermission(permission);
        module.setDescription("Student menu: " + title);
        module.setIsActive(true);

        moduleRepository.save(module);
    }

    private ModuleGroup getOrCreateGroup(String name, int order) {
        return groupRepository.findByName(name).orElseGet(() -> {
            ModuleGroup group = new ModuleGroup();
            group.setName(name);
            group.setDescription("Student learning navigation");
            group.setDisplayOrder(order);
            group.setIsActive(true);
            return groupRepository.save(group);
        });
    }
}
