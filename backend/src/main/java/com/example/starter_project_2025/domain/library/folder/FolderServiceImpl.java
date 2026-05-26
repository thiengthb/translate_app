package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FolderServiceImpl
        extends BaseCrudServiceImpl<Folder, Long, FolderDTO, FolderFilter>
        implements FolderService {

    FolderMapper folderMapper;
    FolderRepository folderRepository;
    UserRepository userRepository;

    @Override
    protected BaseCrudRepository<Folder, Long> getRepository() {
        return folderRepository;
    }

    @Override
    protected BaseCrudMapper<Folder, FolderDTO> getMapper() {
        return folderMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "description"};
    }

    @Override
    protected void beforeCreate(Folder folder, FolderDTO request, ValidationContext ctx) {

        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            ctx.add("userId", "User not found");
            return;
        }
        folder.setUser(user);

        if (folderRepository.existsByNameAndUserId(request.getName(), request.getUserId())) {
            ctx.add("name", "Folder name already exists for this user");
        }
    }

    @Override
    protected void beforeUpdate(Folder folder, FolderDTO request, ValidationContext ctx) {

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                ctx.add("userId", "User not found");
                return;
            }
            folder.setUser(user);
        }

        if (request.getName() != null &&
                !request.getName().equals(folder.getName()) &&
                folderRepository.existsByNameAndUserIdAndIdNot(
                        request.getName(), folder.getUser().getId(), folder.getId())) {
            ctx.add("name", "Folder name already exists for this user");
        }
    }
}
