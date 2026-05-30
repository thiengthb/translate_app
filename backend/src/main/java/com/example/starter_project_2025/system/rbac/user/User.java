package com.example.starter_project_2025.system.rbac.user;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.dataio.exporter.annotation.ExportEntity;
import com.example.starter_project_2025.base.dataio.exporter.annotation.ExportField;
import com.example.starter_project_2025.base.dataio.importer.annotation.ImportField;
import com.example.starter_project_2025.base.dataio.importer.annotation.ImportHash;
import com.example.starter_project_2025.base.dataio.template.annotation.ImportEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.role.Role;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ImportEntity("user")
@ExportEntity(fileName = "users", sheetName = "Users")
@ResourcePermission("USER")
@ResourceMenu(
        title = "Users",
        group = "RBAC",
        icon = "users",
        url = "/users",
        description = "Manage user accounts, roles and account status.",
        order = 1,
        permission = "USER_READ"
)
@Searchable(fields = {"email", "firstName", "lastName"})
@AutoCrud(path = "users")
public class User extends BaseEntity {

    @Column(unique = true, nullable = false)
    @ImportField(name = "Email", required = true)
    @ExportField(name = "Email")
    String email;

    @Column(nullable = false)
    @ImportHash
    @ImportField(name = "Password", required = true)
    String passwordHash;

    @Column(nullable = false, length = 100)
    @ImportField(name = "First Name", required = true)
    @ExportField(name = "First Name")
    String firstName;

    @Column(length = 100)
    String lastName;

    @Column(length = 20)
    String phone;

    @Column(length = 500)
    String bio;

    @Column(length = 512)
    String avatarUrl;

    @Column(length = 10)
    String locale;

    @Column(length = 10)
    String theme;

    /** Base32-encoded TOTP secret. Null until the user enrolls in 2FA. */
    @Column(length = 64)
    String totpSecret;

    /**
     * Set to true only after the user confirms their first TOTP code.
     * Nullable in DB so existing rows from before this migration default to
     * "not enrolled" without a backfill.
     */
    @Column
    Boolean totpEnabled;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @ExportField(name = "Roles", relation = true, path = "name")
    @ImportField(name = "Roles", lookupEntity = Role.class, lookupField = "name", separator = ",")
    @JoinTable( name = "user_roles",
                joinColumns = @JoinColumn(name = "user_id"),
                inverseJoinColumns = @JoinColumn(name = "role_id"))
    Set<Role> roles = new HashSet<>();

    public String getFullName() {
        return firstName + (lastName != null ? " " + lastName : "");
    }
}
