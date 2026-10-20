# 📱 MoonLight Mobile (React Native + Expo)

> **Ứng dụng di động quản trị nhà trọ & căn hộ MoonLight đa nền tảng (iOS & Android).**
> Được xây dựng với **Expo SDK 52/53**, **Expo Router** (file-based navigation), **TypeScript strict**, **TanStack Query**, **Zustand**, và hệ thống Design System **Serene Nocturne** bám sát [DESIGN.md](file:///d:/workspace/Retal_Management/frontend/design/stitch/DESIGN.md).

---

## 🚀 Khởi chạy ứng dụng

### 1. Cài đặt thư viện (Nếu chưa cài)
```bash
cd frontend
npm install
```

### 2. Khởi động Expo Development Server
```bash
npm start
# hoặc
npx expo start
```

Sau khi chạy lệnh trên, màn hình terminal sẽ hiển thị một mã **QR Code**:
* **Chạy trên iPhone (iOS)**:
  * Cài app **Expo Go** từ App Store trên iPhone.
  * Mở ứng dụng **Camera** mặc định của iPhone quét mã QR trên terminal để mở app trực tiếp.
  * Hoặc nhấn phím `i` trong terminal nếu đang dùng máy tính macOS có Xcode iOS Simulator.
* **Chạy trên Android**:
  * Cài app **Expo Go** từ Google Play Store trên máy Android.
  * Mở Expo Go và chọn **"Scan QR code"** để quét mã.
  * Hoặc nhấn phím `a` trong terminal để mở trên Android Studio Emulator.
* **Chạy trên Trình duyệt Web**:
  * Nhấn phím `w` trong terminal để mở trực tiếp trên Chrome/Safari/Edge.

---

## 🎨 Cấu trúc Thư mục

```text
frontend/
├── assets/
│   └── images/            # Icon MoonLight chuẩn, Splash Screen, Favicon
├── src/
│   ├── api/
│   │   └── client.ts      # API Client kết nối Backend NestJS (Auto refresh 401, Tiếng Việt)
│   ├── app/               # Expo Router (File-based navigation)
│   │   ├── _layout.tsx    # Root layout bọc QueryClientProvider, Auth, Theme
│   │   └── index.tsx      # Dashboard tổng quan: Doanh thu, Công nợ, Phòng trọ
│   ├── components/
│   │   └── common/
│   │       └── StatusBadge.tsx # Huy hiệu trạng thái chuẩn Rule 5 (màu + nhãn + icon)
│   ├── i18n/
│   │   ├── index.ts       # Cấu hình i18next
│   │   └── vi.json        # Từ điển tiếng Việt mặc định
│   ├── store/
│   │   └── authStore.ts   # Quản lý phiên đăng nhập Zustand + AsyncStorage
│   ├── theme/
│   │   ├── colors.ts      # Bảng màu Serene Nocturne (DESIGN.md)
│   │   └── tokens.ts      # Design tokens (khoảng cách, bo góc, đổ bóng, font)
│   └── utils/
│       └── format.ts      # Định dạng tiền tệ VND (3.935.000 ₫) & ngày tháng dd/MM/yyyy
├── app.json               # Cấu hình định danh iOS (Bundle ID) & Android (Package)
└── package.json
```

---

## 🛠️ Lệnh Kiểm thử & Quản trị

```bash
# Kiểm tra TypeCheck TypeScript
npm run typecheck

# Khởi chạy chế độ Android
npm run android

# Khởi chạy chế độ iOS
npm run ios

# Khởi chạy chế độ Web
npm run web
```
