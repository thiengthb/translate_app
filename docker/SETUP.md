# Khởi động services (MySQL + Redis)

### Project sử dụng Docker để chạy database và cache. Chỉ cần một lệnh:

```bash
docker compose -f docker/dev-env.yml --env-file backend/.env up -d
```

### Kiểm tra services đã chạy:

```bash
docker compose -f docker/dev-env.yml ps
```

> MySQL sẽ sẵn sàng sau khoảng 15–20 giây (healthcheck). Redis khởi động ngay lập tức.

### Để dừng services:

```bash
docker compose -f docker/dev-env.yml down -v
```

# Sử dụng tài nguyên mysql ở máy của Thiên

### Các đường link để sử dụng

- ollama.thientnse.site -> sử dụng ollama cho dịch thuật
- mysql.thientnse.site -> kết nối với database
- phpmyadmin.thientnse.site -> quản lý database bằng GUI ~ mysql workbench


### Để kết nối và sử dụng được mysql thì thực hiện các bước sau đây:

Tải Cloudflare
```bash
winget install Cloudflare.cloudflared
```

Cho phép Cloudflare sử dụng mysql
```bash
cloudflared access tcp --hostname mysql.thientnse.site --url localhost:3306
```

Sau đó trong env backend phải chỉnh thành
```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=translate_app_<name>
MYSQL_USER=root
MYSQL_PASSWORD=root
```
> Chuyển <name> thành tên người thực hiện giúp chia db khi sử dụng song song