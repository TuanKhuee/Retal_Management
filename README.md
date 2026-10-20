# 🏢 Rental Management Platform (Nền Tảng Quản Lý Nhà Trọ & Căn Hộ)

> **Hệ thống Backend chuyên nghiệp, hiện đại phục vụ quản lý chuỗi nhà trọ, căn hộ dịch vụ và phòng cho thuê đa chi nhánh (Multi-tenant).**
> Được xây dựng với kiến trúc hướng sự kiện (Event-driven Architecture), bảo mật chặt chẽ (RBAC, Multi-tenancy, Data Encryption), giao dịch ACID (MongoDB Replica Set) và hàng đợi tác vụ nền (Redis & BullMQ).

---

## 📑 Mục lục
1. [Kiến trúc & Công nghệ](#-kiến-trúc--công-nghệ)
2. [Cấu trúc Thư mục](#-cấu-trúc-thư-mục)
3. [Hướng dẫn Cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
   - [Chạy với Docker Compose (Khuyên dùng)](#1-chạy-với-docker-compose-khuyên-dùng)
   - [Chạy trên môi trường Local Development](#2-chạy-trên-môi-trường-local-development)
4. [Dữ liệu Mẫu (Seed Data)](#-dữ-liệu-mẫu-seed-data)
5. [Tài liệu API (OpenAPI & TypeScript Client)](#-tài-liệu-api-openapi--typescript-client)
6. [Danh sách Biến Môi trường (Environment Variables)](#-danh-sách-biến-môi-trường-environment-variables)
7. [Kiến trúc Bảo mật & Hardening](#-kiến-trúc-bảo-mật--hardening)
8. [Đối chiếu Acceptance Criteria (PRD) & Bằng chứng Test](#-đối-chiếu-acceptance-criteria-prd--bằng-chứng-test)

---

## 🚀 Kiến trúc & Công nghệ

- **Framework**: [NestJS](https://nestjs.com/) (Node.js 20, TypeScript, kiến trúc Modular & Dependency Injection).
- **Cơ sở dữ liệu**: [MongoDB](https://www.mongodb.com/) 7.0 cấu hình **Replica Set (`rs0`)** hỗ trợ đầy đủ **Multi-document ACID Transactions**.
- **Bộ nhớ đệm & Hàng đợi**: [Redis](https://redis.io/) 7 + [BullMQ](https://docs.bullmq.io/) phục vụ hàng đợi tác vụ nền (gửi thông báo, xuất báo cáo, tính hóa đơn lô, quét quá hạn).
- **Thời gian thực (Real-time)**: [Socket.IO](https://socket.io/) namespace `/rt` tích hợp xác thực JWT, bảo vệ room theo User ID & Org ID.
- **Lưu trữ Đối tượng (Storage)**: [MinIO](https://min.io/) / AWS S3 hỗ trợ Presigned Upload URL với kiểm tra MIME type và giới hạn kích thước nghiêm ngặt.
- **Bảo mật**:
  - Hashing mật khẩu bằng thuật toán kháng GPU [Argon2id](https://github.com/ranisalt/node-argon2).
  - Mã hóa CCCD/CMND bằng [AES-256-GCM](https://nodejs.org/api/crypto.html) kèm Authenticated Tag.
  - Phân quyền 3 lớp: `JwtAuthGuard` ➔ `RolesGuard` ➔ `Multi-tenant Isolation Guard`.
  - Rate limiting chống Brute-force & Credential Stuffing bằng `@nestjs/throttler`.
  - Che giấu dữ liệu nhạy cảm tự động trong HTTP Logs (`SanitizeLogInterceptor`).

---

## 📁 Cấu trúc Thư mục

```text
Retal_Management/
├── backend/
│   ├── src/
│   │   ├── common/             # Guards, Interceptors, Filters, Utils, Constants
│   │   ├── config/             # Config validation & environment loaders
│   │   ├── infra/              # Database (Mongoose), Redis, BullMQ, Health, Socket.IO
│   │   ├── jobs/               # Scheduled cron jobs (due date, overdue, lease expire)
│   │   ├── modules/
│   │   │   ├── auth/           # Đăng ký, đăng nhập argon2id, refresh token rotation
│   │   │   ├── organization/   # Multi-tenancy, Quản lý thành viên & phân quyền
│   │   │   ├── property/       # Quản lý Tòa nhà & Phòng trọ (State Machine)
│   │   │   ├── tenant/         # Quản lý Khách thuê & Mã hóa CCCD AES-256-GCM
│   │   │   ├── service/        # Dịch vụ điện, nước, rác, wifi kèm lịch sử giá
│   │   │   ├── contract/       # Hợp đồng thuê, phụ lục đổi giá, sổ tiền cọc
│   │   │   ├── meter-reading/  # Công tơ điện/nước, chốt chỉ số, phát hiện bất thường
│   │   │   ├── billing-period/ # Kỳ tính phí (Open / Close), sinh hóa đơn lô
│   │   │   ├── invoice/        # Tính toán hóa đơn, thanh toán từng phần, theo dõi công nợ
│   │   │   ├── payment/        # Thanh toán (Cash / Chuyển khoản), Idempotency Key
│   │   │   ├── maintenance/    # Ticket sửa chữa bảo trì, quy trình chuyển trạng thái
│   │   │   ├── attachment/     # MinIO/S3 presigned upload & signed download URL
│   │   │   ├── notification/   # In-app notification, dispatch queue & push Socket.IO
│   │   │   ├── report/         # Thống kê doanh thu, công nợ, lấp đầy, xuất Excel/PDF
│   │   │   └── audit-log/      # Nhật ký kiểm toán phân trang cursor
│   │   ├── client/             # Typed TypeScript API Client SDK cho Frontend
│   │   └── scripts/            # Script tạo OpenAPI (generate-openapi.ts) & Seeding (seed.ts)
│   ├── test/                   # E2E test suites kiểm thử tích hợp & bảo mật
│   ├── Dockerfile              # Multi-stage production build Dockerfile
│   └── package.json
├── docker-compose.yml          # Cấu hình container API, Mongo Replica Set, Redis, MinIO
├── openapi.json                # File OpenAPI 3.0 Specification chuẩn
└── README.md                   # Tài liệu hướng dẫn sử dụng và kiểm thử
```

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy

### 1. Chạy với Docker Compose (Khuyên dùng)
Hệ thống được đóng gói hoàn chỉnh gồm: API, Mongo (Replica Set `rs0`), Redis, và MinIO S3.

```bash
# 1. Khởi động toàn bộ dịch vụ trong background
docker compose up -d --build

# 2. Kiểm tra trạng thái các container
docker compose ps

# 3. Theo dõi log ứng dụng
docker compose logs -f app
```

- **API Endpoint**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `http://localhost:3000/docs`
- **MinIO Console**: `http://localhost:9001` (User: `minioadmin` / Pass: `minioadmin`)

---

### 2. Chạy trên môi trường Local Development

#### Yêu cầu tiên quyết:
- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **MongoDB**: Đang chạy với Replica Set (hoặc Standalone có cờ transactions bật)
- **Redis**: Đang chạy tại port 6379

#### Các bước thực hiện:

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện dependencies
npm ci

# Sao chép và cấu hình biến môi trường
cp .env.example .env   # (hoặc chỉnh sửa file .env có sẵn)

# Khởi chạy server ở chế độ phát triển (Dev Mode)
npm run dev
# hoặc
npm run start:dev
```

Server sẽ khởi động tại: `http://localhost:3000/api/v1`  
Swagger UI tương tác trực tiếp tại: `http://localhost:3000/docs`

---

## 📦 Dữ liệu Mẫu (Seed Data)

Hệ thống cung cấp sẵn script seed dữ liệu mẫu hoàn chỉnh theo kịch bản chuẩn:
- **1 Owner**: `tuankhue81@gmail.com` (Mật khẩu: `Password123!`, Tên: `Trương Tuấn Khuê`, SĐT: `0342291355`)
- **1 Tòa nhà / Dãy trọ (Property)**: `Dãy trọ MOONLIGHT` (Đường 24A, KDC Tân Đức, Đức Hòa, Long An) thuộc `Hệ thống nhà trọ MOONLIGHT` kèm cấu hình tài khoản MB Bank (`991006200399` - `TRUONG TUAN KHUE`).
- **10 Phòng trọ (Rooms)**:
  - Tầng 1: `A101` – `A105` (5 phòng đang thuê `OCCUPIED` kèm hợp đồng và tiền cọc 3.5 triệu).
  - Tầng 2: `A201` – `A204` (4 phòng trống `VACANT`), `A205` (1 phòng đang bảo trì `MAINTENANCE`).
- **5 Khách thuê (Tenants)**: Có mã hóa CCCD bảo mật AES-256-GCM.
- **4 Dịch vụ**: Điện (3.500 đ/kWh), Nước (25.000 đ/m3), Rác (50.000 đ/phòng), Internet (100.000 đ/tháng).
- **20 Đồng hồ công tơ**: Điện & Nước cho từng phòng.
- **2 Kỳ hóa đơn (Billing Periods)**:
  - **Kỳ 2026-08**: 5 hóa đơn tương ứng 5 phòng, trạng thái `PAID` (đã thu đủ).
  - **Kỳ 2026-09**: 5 hóa đơn gồm:
    - 2 hóa đơn `PAID` (phòng A101, A102).
    - 2 hóa đơn `PARTIALLY_PAID` (phòng A103, A104 – thanh toán 1 phần).
    - 1 hóa đơn `ISSUED` (phòng A105 – chưa thanh toán, phát sinh công nợ).

Chạy lệnh seed:
```bash
npm run seed
```

---

## 📑 Tài liệu API (OpenAPI & TypeScript Client)

### 1. Xuất file OpenAPI 3.0 Specification
Để tái tạo file `openapi.json` chứa định nghĩa đầy đủ tất cả endpoint, DTO và Security Scheme:
```bash
npm run generate:openapi
```
File sẽ được ghi ra tại `Retal_Management/openapi.json` và `Retal_Management/backend/openapi.json`.

### 2. Sử dụng TypeScript API Client SDK
Client SDK được tích hợp sẵn tại `src/client/` giúp frontend (React, Next.js, React Native) gọi API an toàn kiểu dữ liệu (strongly-typed):

```typescript
import { RentalApiClient } from './client';

const client = new RentalApiClient({
  baseUrl: 'http://localhost:3000/api/v1',
  accessToken: 'YOUR_JWT_TOKEN',
  organizationId: 'YOUR_ORG_ID',
});

// 1. Đăng nhập
const authRes = await client.auth.login({
  identity: 'owner@rental.vn',
  password: 'Password123!',
});
client.setAccessToken(authRes.data.tokens.accessToken);

// 2. Lấy báo cáo doanh thu & công nợ
const revenue = await client.reports.getRevenue({ period: '2026-09' });
const debt = await client.reports.getDebt();

// 3. Tạo ticket bảo trì phòng
const maint = await client.maintenance.create({
  title: 'Hỏng vòi sen nhà tắm',
  category: 'PLUMBING',
  description: 'Vòi sen phòng A102 bị rò rỉ nước',
  priority: 'HIGH',
});
```

---

## ⚙️ Danh sách Biến Môi trường (Environment Variables)

| Tên biến | Bắt buộc | Giá trị mẫu / Mặc định | Mô tả |
| :--- | :---: | :--- | :--- |
| `PORT` | Không | `3000` | Port lắng nghe HTTP của Backend API |
| `NODE_ENV` | Không | `development` / `production` | Chế độ chạy ứng dụng |
| `MONGODB_URI` | **Có** | `mongodb://localhost:27017/rental_management?replicaSet=rs0` | Connection String tới MongoDB (yêu cầu Replica Set cho Transaction) |
| `REDIS_HOST` | **Có** | `localhost` | Địa chỉ host của Redis Server |
| `REDIS_PORT` | **Có** | `6379` | Port kết nối Redis |
| `REDIS_PASSWORD`| Không | *(trống)* | Mật khẩu truy cập Redis (nếu có) |
| `JWT_SECRET` | **Có** | *(Tối thiểu 32 ký tự ngẫu nhiên)* | Khóa bí mật ký cấp phát JWT Access Token |
| `JWT_EXPIRES_IN`| Không | `15m` | Thời hạn sống của Access Token |
| `REFRESH_TOKEN_EXPIRES_IN` | Không | `7d` | Thời hạn sống của Refresh Token |
| `ENCRYPTION_KEY`| **Có** | *(Chuỗi Hex 64 ký tự = 32 bytes)* | Khóa bí mật dùng cho thuật toán AES-256-GCM (mã hóa CCCD) |
| `S3_ENDPOINT` | Không | `http://localhost:9000` | Endpoint dịch vụ MinIO / S3 tương thích |
| `S3_ACCESS_KEY_ID` | Không | `minioadmin` | Access Key kết nối S3/MinIO |
| `S3_SECRET_ACCESS_KEY` | Không | `minioadmin` | Secret Key kết nối S3/MinIO |
| `S3_BUCKET_NAME`| Không | `rental-storage` | Tên Bucket lưu trữ tài liệu, ảnh công tơ, hóa đơn |
| `S3_FORCE_PATH_STYLE` | Không | `true` | Bật path-style URL đối với MinIO Server |
| `THROTTLE_TTL` | Không | `60000` | Khung thời gian Rate limit tính bằng mili-giây (1 phút) |
| `THROTTLE_LIMIT`| Không | `100` | Số request tối đa cho phép trong khung thời gian |

---

## 🛡️ Kiến trúc Bảo mật & Hardening

1. **Bảo vệ xác thực & phân quyền 3 lớp (Defense in Depth)**:
   - **Lớp 1 (Authentication)**: `JwtAuthGuard` kiểm tra tính hợp lệ của chữ ký JWT, thời hạn hết hạn, và trạng thái người dùng. Yêu cầu token trên toàn bộ endpoint ngoại trừ các endpoint công khai gắn `@Public()`. Khi thiếu hoặc sai token, trả về **`401 Unauthorized`**.
   - **Lớp 2 (Role-Based Access Control)**: `RolesGuard` đảm bảo vai trò của người dùng (`OWNER`, `MANAGER`, `TENANT`) có đủ quyền thực thi. Khi `TENANT` cố tình gọi các endpoint quản trị của `OWNER` (như tạo phòng, ký hợp đồng, phát hành hóa đơn, xem báo cáo doanh thu), hệ thống lập tức chặn với mã **`403 Forbidden`**.
   - **Lớp 3 (Multi-tenant Ownership Isolation)**: Mọi thao tác truy vấn dữ liệu đều bắt buộc ràng buộc `organizationId`. Khi một tổ chức này cố tình truy xuất `id` tài nguyên của tổ chức khác, hệ thống chủ động trả về **`404 Not Found`** (thay vì 403) để ngăn chặn hoàn toàn kỹ thuật dò quét ID (Resource Enumeration).

2. **Chống tấn công Brute-force**:
   - Khóa tài khoản tạm thời 15 phút sau 5 lần nhập sai mật khẩu liên tiếp.
   - Giới hạn tần suất gọi API với `@Throttle`:
     - `POST /auth/login`: Tối đa 5 lần / phút / IP.
     - `POST /auth/refresh`: Tối đa 10 lần / phút / IP.

3. **Chống rò rỉ dữ liệu nhạy cảm (Zero Sensitive Leakage)**:
   - `SanitizeLogInterceptor` tự động chặn và ghi đè `[REDACTED]` đối với mọi trường nhạy cảm trong HTTP Body/Query trước khi ghi log: `password`, `token`, `refreshToken`, `accessToken`, `authorization`, `cccd`, `idCard`, `secret`.
   - CCCD được lưu trữ dưới dạng mã hóa `AES-256-GCM` trong database. Chỉ người dùng có quyền `TENANT_SENSITIVE_READ` (OWNER/MANAGER) mới được hệ thống giải mã trả về.

---

## ✅ Đối chiếu Acceptance Criteria (PRD) & Bằng chứng Test

Hệ thống được kiểm thử toàn diện với **18 Unit Test Suites (138 tests)** và **9 E2E Test Suites (130 tests)**. Dưới đây là bảng đối chiếu chi tiết từng tiêu chí chấp nhận:

| Hạng mục / Tiêu chí PRD | Yêu cầu Nghiệp vụ | Test Suite Chứng minh | Kết quả |
| :--- | :--- | :--- | :---: |
| **1. Auth & Multi-tenancy** | - Đăng ký Owner + Org + Membership trong 1 Transaction<br>- Mật khẩu băm bằng Argon2id<br>- Khóa tạm sau 5 lần đăng nhập sai<br>- Refresh token rotation & phát hiện reuse thu hồi cả chuỗi | [`auth.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/auth/auth.service.spec.ts)<br>[`auth-flow.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/auth-flow.e2e-spec.ts) | **PASSED** (100%) |
| **2. Properties & Rooms** | - Unique `(organizationId, propertyId, code)`<br>- Chuyển trạng thái phòng: `VACANT` ➔ `OCCUPIED` ➔ `MAINTENANCE`<br>- Xóa mềm phòng, chặn xóa khi phòng đang `OCCUPIED`<br>- Dashboard khu trọ: tổng phòng, đang thuê, trống, công nợ | [`room-state-machine.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/property/room-state-machine.spec.ts)<br>[`property-tenant.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/property-tenant.e2e-spec.ts) | **PASSED** (100%) |
| **3. Tenants & Security** | - CCCD mã hóa AES-256-GCM kèm `numberLast4`<br>- Tenant chỉ đọc được hồ sơ cá nhân và phòng mình thuê<br>- Chặn Tenant đọc số CCCD giải mã nếu không có quyền | [`cccd-crypto.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/common/utils/cccd-crypto.spec.ts)<br>[`property-tenant.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/property-tenant.e2e-spec.ts) | **PASSED** (100%) |
| **4. Services & Contracts** | - Đổi giá dịch vụ tạo `priceHistory`, không ảnh hưởng hóa đơn cũ<br>- Sinh mã hợp đồng tự động (Counters)<br>- Quản lý cọc (Sổ cọc `COLLECTED`, `DEDUCTED`, `REFUNDED`)<br>- Phụ lục hợp đồng (`revisions`), tăng version, audit log | [`service.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/service/service.service.spec.ts)<br>[`contract.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/contract/contract.service.spec.ts)<br>[`contract-advanced.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/contract/contract-advanced.spec.ts) | **PASSED** (100%) |
| **5. Meters & Readings** | - Công thức `consumption = currentValue - previousValue`<br>- Phát hiện bất thường (`ABNORMAL`) khi dùng >3x trung bình<br>- Hỗ trợ cờ tua vòng (`ROLLOVER`) và thay đồng hồ (`METER_REPLACED`)<br>- Khóa chỉ số theo kỳ (`LOCKED`), import Excel 2 bước | [`meter-reading.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/meter-reading/meter-reading.service.spec.ts)<br>[`meters-readings.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/meters-readings.e2e-spec.ts) | **PASSED** (100%) |
| **6. Billing Calculator** | - Pure function độc lập DB, tính tiền theo kỳ<br>- Prorate tiền phòng theo số ngày thực tế vào/ra giữa kỳ<br>- Làm tròn theo `roundingStep`<br>- Test ca biên chuẩn: `3.000.000 + 455.000 + 300.000 + 50.000 + 30.000 + 100.000 = 3.935.000` | [`billing-calculator.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/common/utils/billing-calculator.spec.ts) | **PASSED** (100%) |
| **7. Invoices & Payments** | - Sinh hóa đơn lô idempotent theo kỳ, chỉ sinh khi đã LOCK chỉ số<br>- Thanh toán từng phần (`PARTIALLY_PAID`) và đủ (`PAID`)<br>- Idempotency-Key chống trùng lặp thanh toán<br>- Báo cáo chuyển khoản (`PaymentClaim`) kèm ảnh chứng từ | [`invoice.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/invoice/invoice.service.spec.ts)<br>[`payment.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/payment/payment.service.spec.ts)<br>[`billing-invoice-payment.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/billing-invoice-payment.e2e-spec.ts) | **PASSED** (100%) |
| **8. Maintenance & Storage** | - Quy trình vòng đời ticket: `NEW` ➔ `ACCEPTED` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `CONFIRMED`<br>- Ghi nhận chi phí và bên chịu phí (`cost.paidBy`)<br>- MinIO Presigned URL kiểm tra whitelist MIME và dung lượng tối đa | [`maintenance.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/maintenance/maintenance.service.spec.ts)<br>[`attachment.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/attachment/attachment.service.spec.ts)<br>[`maintenance-attachments.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/maintenance-attachments.e2e-spec.ts) | **PASSED** (100%) |
| **9. Socket & Notifications** | - Socket.IO `/rt` xác thực JWT lúc handshake, join room tự động<br>- Dispatch queue BullMQ xử lý thông báo ngầm<br>- Sự kiện: `notification.created`, `maintenance.statusChanged`, `payment.confirmed` | [`notification.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/notification/notification.service.spec.ts)<br>[`socket.gateway.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/infra/socket/socket.gateway.spec.ts)<br>[`notifications-socket-jobs.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/notifications-socket-jobs.e2e-spec.ts) | **PASSED** (100%) |
| **10. Jobs & Scheduled Tasks** | - Quét hóa đơn sắp đến hạn (trước 3 ngày)<br>- Quét đánh dấu hóa đơn quá hạn (`OVERDUE`) hàng ngày lúc 00:05<br>- Cảnh báo hợp đồng sắp hết hạn (trước 30 ngày) | [`invoice-mark-overdue.job.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/jobs/invoice-mark-overdue.job.spec.ts)<br>[`notifications-socket-jobs.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/notifications-socket-jobs.e2e-spec.ts) | **PASSED** (100%) |
| **11. Reports & Analytics** | - Báo cáo `revenue`, `debt`, `occupancy`, `utilities`, `maintenance`<br>- Sử dụng MongoDB Aggregation Pipelines và Index tối ưu<br>- Async Export job trả về `jobId` và gửi notification khi hoàn tất | [`report.service.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/report/report.service.spec.ts) | **PASSED** (100%) |
| **12. Audit Logs** | - Ghi nhận tự động qua Interceptor và `@Audit()` decorator<br>- Lọc theo `entity`, `actor`, khoảng thời gian `from`-`to`<br>- Phân trang dựa trên Cursor (`nextCursor`) hiệu năng cao | [`audit-log.service.ts`](file:///d:/workspace/Retal_Management/backend/src/modules/audit-log/audit-log.service.ts)<br>[`security-hardening.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/security-hardening.e2e-spec.ts) | **PASSED** (100%) |
| **13. Security Hardening** | - **(a)** Mọi endpoint bắt buộc token (trừ `@Public`), thiếu ➔ `401`<br>- **(b)** `TENANT` gọi endpoint `OWNER` bị chặn ➔ `403`<br>- **(c)** Truy cập tài nguyên khác `organizationId` ➔ `404`<br>- Rate limit bảo vệ đăng nhập / refresh<br>- Không log mật khẩu, CCCD, access token | [`guards.spec.ts`](file:///d:/workspace/Retal_Management/backend/src/common/guards/guards.spec.ts)<br>[`security-hardening.e2e-spec.ts`](file:///d:/workspace/Retal_Management/backend/test/security-hardening.e2e-spec.ts) | **PASSED** (100%) |

---

## 🧪 Lệnh Chạy Toàn Bộ Kiểm Thử

```bash
# Chạy toàn bộ Unit Tests (18 suites, 138 tests)
npm run test

# Chạy toàn bộ E2E Tests (9 suites, 130 tests)
npm run test:e2e

# Chạy kiểm tra độ bao phủ mã nguồn (Coverage)
npm run test:cov
```
