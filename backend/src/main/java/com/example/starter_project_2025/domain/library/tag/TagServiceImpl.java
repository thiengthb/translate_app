package com.example.starter_project_2025.domain.library.tag;

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
public class TagServiceImpl
        extends BaseCrudServiceImpl<Tag, Long, TagDTO, TagFilter>
        implements TagService {

    TagMapper tagMapper;
    TagRepository tagRepository;
    UserRepository userRepository;

    @Override
    protected BaseCrudRepository<Tag, Long> getRepository() {
        return tagRepository;
    }

    @Override
    protected BaseCrudMapper<Tag, TagDTO> getMapper() {
        return tagMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "description"};
    }

    @Override
    protected void beforeCreate(Tag tag, TagDTO request, ValidationContext ctx) {

        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            ctx.add("userId", "User not found");
            return;
        }
        tag.setUser(user);

        if (tagRepository.existsByNameAndUserId(request.getName(), request.getUserId())) {
            ctx.add("name", "Tag name already exists for this user");
        }
    }

    @Override
    protected void beforeUpdate(Tag tag, TagDTO request, ValidationContext ctx) {

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                ctx.add("userId", "User not found");
                return;
            }
            tag.setUser(user);
        }

        if (request.getName() != null &&
                !request.getName().equals(tag.getName()) &&
                tagRepository.existsByNameAndUserIdAndIdNot(
                        request.getName(), tag.getUser().getId(), tag.getId())) {
            ctx.add("name", "Tag name already exists for this user");
        }
    }
}
