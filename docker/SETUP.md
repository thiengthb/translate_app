# Khởi động services (MySQL + Redis)

Project sử dụng Docker để chạy database và cache. Chỉ cần một lệnh:

```bash
docker compose -f docker/dev-env.yml up -d
```

Kiểm tra services đã chạy:

```bash
docker compose -f docker/dev-env.yml ps
```

> MySQL sẽ sẵn sàng sau khoảng 15–20 giây (healthcheck). Redis khởi động ngay lập tức.

Để dừng services:

```bash
docker compose -f docker/dev-env.yml down
```
