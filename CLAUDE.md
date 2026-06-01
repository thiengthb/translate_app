# CLAUDE.md

Đây là starter framework Spring Boot + React với auto-CRUD system. Tài liệu này là entry point cho mọi session — đọc xong là làm việc được ngay, không cần dò code.

## Tech stack

| Layer | Stack |
|---|---|
| BE | Spring Boot 3.3.3, Java 21, JPA/Hibernate, H2 (dev) / MySQL (prod), MapStruct, ByteBuddy, Caffeine, Lombok |
| FE | React 19, Vite 7, TypeScript 5, Redux Toolkit, TanStack Query, Tailwind, Radix (shadcn pattern), react-router 7 |
| Auth | JWT RSA (Nimbus), refresh-token rotation, Google OAuth2 |
| Build | Maven (`./mvnw spring-boot:run` cho BE), `npm run dev` cho FE |

## ⚡ DO / DON'T

**ĐỪNG bao giờ:**
- Tạo `XxxController.java` cho CRUD thuần. `AutoCrudEndpointRegistrar` tự đăng ký endpoints khi entity có `@AutoCrud`.
- Tạo `XxxService.java` interface rỗng. ServiceImpl extends thẳng `BaseCrudServiceImpl<...>`.
- Tạo `XxxFilter.java` nếu không thêm field filter mới. Dùng `BaseFilter` trực tiếp ở generic param.
- Tạo `XxxMapper.java` nếu DTO ↔ Entity field same-name. `DefaultCrudMapper` (BeanUtils) tự handle.
- Tạo `XxxRepository.java` nếu không có method query custom. `RuntimeRepositoryGenerator` sinh interface qua ByteBuddy.
- Tạo `XxxServiceImpl.java` nếu không có business hook. `DefaultCrudServiceImpl` tự đăng ký qua `AutoCrudBeanRegistrar`.
- Hardcode `console.log` ở FE. Dùng `@/lib/logger` (DEV-only).
- Hardcode auth localStorage key. Dùng `@/lib/auth-storage`.
- Quên `@NoArgsConstructor + @AllArgsConstructor` khi tạo Filter có `@Builder` (Jackson cần no-args).

**LUÔN:**
- Thêm `@AutoCrud(path="<plural>")` cho mọi entity CRUD.
- Thêm `@ResourcePermission("<UPPER>")` để permission auto-generate.
- Thêm `@ResourceMenu(...)` để menu auto-sinh vào DB → FE sidebar.
- Thêm `@Searchable(fields={...})` cho full-text search (BaseCrudServiceImpl đọc default).
- Migrate entity mới vào `system/<feature>/<entity>/` package.

## 📁 Cách thêm entity mới (recipe by complexity)

### Tối giản — không validation, không relation (vd: `Tag`)
**2 file BE**: `Tag.java` + `TagDTO.java`. Zero FE file (metadata-driven fallback).

```java
@Entity
@Table(name = "tags")
@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@ResourcePermission("TAG")
@ResourceMenu(title = "Tags", group = "...", icon = "tags", url = "/tags", order = 1, permission = "TAG_READ")
@Searchable(fields = {"name"})
@AutoCrud(path = "tags")
public class Tag extends BaseEntity { ... }
```

### Có unique-name validation (vd: `Book`, `Permission`)
**4 file BE**: Entity + DTO + Repository (`existsByName`) + ServiceImpl (hooks).

### Có ID-list ↔ relation-entity mapping (vd: `User.roleIds ↔ Set<Role>`)
**6 file BE**: + Mapper (MapStruct) + Filter (custom IN/LIKE).

→ Mỗi file phụ tương ứng **đúng một** business concern. Không có "file boilerplate cho có".

## 🗂️ Cấu trúc package BE

```
backend/src/main/java/com/example/starter_project_2025/
├── base/                           ← FRAMEWORK — không sửa nếu không hiểu sâu
│   ├── crud/
│   │   ├── autoregister/           ← Heart of auto-CRUD
│   │   │   ├── AutoCrudBeanRegistrar      (BFPP — register repo+mapper+service beans)
│   │   │   ├── AutoCrudEndpointRegistrar  (ContextRefreshed — register HTTP endpoints)
│   │   │   ├── AutoCrudAutoConfig         (@Configuration wiring)
│   │   │   ├── GenericCrudHandler         (per-entity request handler)
│   │   │   └── RuntimeRepositoryGenerator (ByteBuddy interface synth)
│   │   ├── service/
│   │   │   ├── BaseCrudServiceImpl        (abstract base, smart-default lookups)
│   │   │   └── DefaultCrudServiceImpl     (no-hooks fallback)
│   │   ├── mapper/
│   │   │   ├── BaseCrudMapper             (interface)
│   │   │   └── DefaultCrudMapper          (BeanUtils-based fallback)
│   │   ├── domain/BaseCrudRepository + BaseEntity
│   │   ├── dto/BaseDTO + BaseFilter + OnCreate/OnUpdate validation groups
│   │   ├── spec/AutoSpecBuilder + @FilterField                 (dynamic Specification)
│   │   └── validation/ValidationContext + BusinessValidationException
│   ├── annotation/                 ← Entity-level markers
│   │   ├── AutoCrud, Searchable, SoftDelete, AuditEnabled, TenantScoped, FieldMeta
│   ├── dataio/                     ← Import/Export Excel/CSV/PDF
│   ├── metadata/                   ← /api/meta/entities (schema introspection)
│   ├── audit/                      ← Audit log (entity has @AuditEnabled)
│   ├── tenant/                     ← Multi-tenant (entity has @TenantScoped)
│   ├── event/EntityEvent           ← Domain events published by BaseCrudServiceImpl
│   └── notification, file, i18n, cache, ratelimit, websocket, workflow
├── init/                           ← @Order CommandLineRunners
│   ├── PermissionInitializer       (@Order 1)  Tạo permissions từ @ResourcePermission
│   ├── RoleDataInitializer         (@Order 2)  Tạo ADMIN/STUDENT/TEACHER roles
│   ├── UserDataInitializer         (@Order 3)  Tạo seed users
│   └── AutoMenuInitializer         (@Order 10) Sync DB modules từ @ResourceMenu
├── security/                       ← JWT, OAuth2, RSA keys, permission checker
├── exception/                      ← GlobalExceptionHandler + Business + Resource exceptions
├── config/                         ← OpenAPI
└── system/                         ← BUSINESS DOMAIN — chỗ thêm entity
    ├── auth/                       ← Login/register/verify/refresh
    ├── rbac/                       ← user, role, permission
    ├── menu/                       ← module, module_groups
    ├── dashboard/
    └── demo/                       ← Book (có hooks), tag/ (full-auto, 2 file)
```

## 🗂️ Cấu trúc FE quan trọng

```
frontend/src/
├── api/
│   ├── axios.ts                    ← Axios + 401 auto-refresh
│   ├── base-service.api.ts         ← createBaseApiService — TẤT CẢ entity dùng
│   ├── endpoints.ts                ← Path constants
│   └── features/<feature>/<entity>.api.ts
├── components/
│   ├── datatable/                  ← ProTable + sub-components (heart of CRUD UI)
│   │   └── hook/                   ← useProTable + 5 composable sub-hooks
│   │       ├── useTableQuery, useTableMutations, useTableRelations,
│   │       └── useTableDataIO, useTablePermissions
│   ├── layout/                     ← Sidebar, NavMain, MainLayout
│   ├── ErrorBoundary               ← App-wide error wrap
│   └── PermissionGate, ProtectedRoute
├── lib/
│   ├── logger.ts                   ← DEV-only console wrapper
│   └── auth-storage.ts             ← Centralized localStorage + mapAuthResponse
├── pages/management/
│   ├── AutoCrudPage.tsx            ← Generic page rendering ProTable
│   ├── MetadataDrivenCrudPage.tsx  ← Fallback khi không có entityConfig file
│   └── <feature>/<entity>/index.tsx  ← Export entityConfig (file-based override)
├── router/
│   ├── build-router.ts             ← import.meta.glob đọc mọi index.tsx
│   └── component-registry.ts       ← Static routes (auth, error pages)
├── hooks/usePermissions, useSidebarMenus, useMetadata
├── contexts/RoleSwitchContext, I18nContext
├── store/slices/auth/authSlice
└── utils/rbac.utils                ← normalize, resolveEffectivePermissions, getHomePathByRole
```

## 🔁 Lifecycle auto-CRUD

```
BFPP phase  (ConfigurationClassPostProcessor → AutoCrudBeanRegistrar):
  Scan @AutoCrud entities → for each:
    - Repository  : <entity>Repository OR auto-gen interface via ByteBuddy
    - Mapper      : <entity>Mapper / <entity>MapperImpl OR DefaultCrudMapper
    - Service     : <entity>ServiceImpl OR DefaultCrudServiceImpl

Init phase  (@CommandLineRunner @Order):
  1. PermissionInitializer   → AUTO permissions from @ResourcePermission × CrudAction
  2. RoleDataInitializer     → ADMIN/STUDENT/TEACHER seed
  3. UserDataInitializer     → admin@/student@/teacher@ seed
  10. AutoMenuInitializer    → @ResourceMenu → DB modules row → FE sidebar query

ContextRefreshed:
  AutoCrudEndpointRegistrar → for each BaseCrudServiceImpl bean with @AutoCrud entity:
    register GET/POST/PUT/DELETE/bulk-delete/export/import via RequestMappingHandlerMapping.

Per request:
  JwtAuthenticationFilter → UserDetailsServiceImpl (Caffeine cached 30s)
    → SecurityContextHolder
  Controller (auto-registered GenericCrudHandler):
    → service.checkPermission(action) [reads @ResourcePermission + JWT authorities]
    → mapper.toEntity / service.beforeCreate hook / repository.save
    → @PrePersist on BaseEntity sets isActive/isDeleted/version defaults
    → AuditLogService logs (async, only if @AuditEnabled)
    → EntityEvent published (caches invalidated, e.g. UserDetailsServiceImpl cache)
```

## 🎯 BE ↔ FE thống nhất qua metadata

`/api/meta/entities/<EntityName>` (require auth) trả về full schema (fields, validation, relations, permissions, menu). FE `MetadataDrivenCrudPage` consume schema này để build UI nếu không có `pages/management/.../<entity>/index.tsx` override.

→ **Workflow thêm entity mới: chỉ cần BE files. FE 0 file** (trừ khi cần custom UX).

## 🐛 Known gotchas

| # | Vấn đề | Fix / lưu ý |
|---|---|---|
| 1 | RSA keys regenerate mỗi restart dev → JWT chết | Production set `JWT_RSA_PUBLIC_KEY_BASE64` + `JWT_RSA_PRIVATE_KEY_BASE64` env |
| 2 | `@SuperBuilder + @Builder.Default` strip field initializer → null trên no-args ctor | `BaseEntity.@PrePersist applyBaseDefaults()` đã handle |
| 3 | MapStruct sinh bean `<entity>MapperImpl` (không phải `<entity>Mapper`) | `BaseCrudServiceImpl.lookupByConvention` thử cả 2 tên |
| 4 | Filter chỉ có `@Builder` → Jackson fail deserialize empty `{}` | Thêm `@NoArgsConstructor @AllArgsConstructor`; `GenericCrudHandler.bindFilter` cũng có fallback `newInstance()` |
| 5 | DefaultCrudMapper KHÔNG handle relation ID ↔ Entity | Entity có `@ManyToOne/@ManyToMany` mà DTO dùng `Set<Long>` → phải viết MapStruct Mapper |
| 6 | DevTools restart làm classloader đổi → ByteBuddy cache cũ | `RuntimeRepositoryGenerator` dùng `WeakHashMap` |
| 7 | `<a href>` trong Sidebar gây full page reload | Dùng `<Link to>` của react-router |
| 8 | `/api/meta/**` từng public → leak schema | Đã require auth trong `SecurityConfig.PUBLIC_ENDPOINTS` |
| 9 | `Searchable(fields)` field phải là `String` column trên entity | `BaseCrudServiceImpl.buildSearchSpec` skip non-String paths |
| 10 | `@Transactional` annotation: dùng `org.springframework.transaction.annotation.Transactional`, KHÔNG `jakarta.transaction` (vì cần `readOnly` flag) | |

## 🧪 Build & run

```bash
# Backend (cwd: backend/)
./mvnw spring-boot:run         # dev, H2 in-memory at http://localhost:8080
./mvnw clean package           # production jar
APP_PROFILE=mysql ./mvnw spring-boot:run   # switch DB

# Frontend (cwd: frontend/)
npm install
npm run dev                    # vite dev http://localhost:5173
npm run build                  # production bundle
npx tsc -b --noEmit            # type check only

# Seed accounts (dev)
admin@example.com   / password123   (full perm)
teacher@example.com / password123   (BOOK_*)
student@example.com / password123   (read-only)
```

H2 console: http://localhost:8080/h2-console (JDBC `jdbc:h2:mem:base_crud`, user `sa`, no password).
Swagger: http://localhost:8080/swagger-ui.html.

## 📝 Convention naming

- Entity: `PascalCase` → table `snake_case_plural` (`Module` → `modules`, `ModuleGroup` → `module_groups`).
- Repository bean: `<entityCamelCase>Repository` (LƯU Ý không dùng plural — `ModuleGroupRepository` chứ không phải `ModuleGroupsRepository`).
- Mapper bean: `<entityCamelCase>Mapper` (MapStruct sinh `MapperImpl`, registrar tìm cả 2).
- Service bean: `<entityCamelCase>ServiceImpl` hoặc `<entityCamelCase>Service`.
- `@AutoCrud(path)`: lowercase plural, dùng `-` cho compound (`module-groups`).
- FE entity file: `<entity>.api.ts`, `<entity>/index.tsx`.

## 🚦 Khi nào KHÔNG dùng auto-CRUD

- Cần custom HTTP routes (non-CRUD endpoint) → viết controller riêng + có thể `@AutoCrud(autoRegister=false)`.
- Cần streaming/SSE/WebSocket → không dùng base CRUD.
- Cần response shape khác `Page<DTO>` chuẩn → override service.
- Bulk import phức tạp (multi-sheet, conditional) → ngoài phạm vi base DataIO.

## 🔍 Khi mò code — start ở đâu?

- "Tại sao endpoint X tự có?" → `AutoCrudEndpointRegistrar.registerServiceIfEligible`.
- "Tại sao bean Y tự sinh?" → `AutoCrudBeanRegistrar.registerBeansForEntity`.
- "Permission check ở đâu?" → `BaseCrudServiceImpl.checkPermission` + `PermissionChecker.require`.
- "Audit log lưu khi nào?" → `BaseCrudServiceImpl.create/update/delete` → `AuditLogService.log*`.
- "FE form render từ đâu?" → `components/datatable/modal/form/FormFieldRenderer.tsx`.
- "FE schema lấy từ đâu?" → file `pages/management/.../<entity>/index.tsx` ưu tiên, fallback `MetadataDrivenCrudPage` → `/api/meta/entities/<name>`.
