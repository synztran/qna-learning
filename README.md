# QNA Learning Platform (Turborepo + Supabase + Next.js + Cloudflare)

Hệ thống ôn tập trắc nghiệm câu hỏi chuyên sâu (dựa trên format [studywithmsnhung.github.io/sc5-mon-md1](https://studywithmsnhung.github.io/sc5-mon-md1/)), tối ưu hóa giao diện di động (iOS safe-area, touch responsiveness, visual feedback tức thì), phân quyền không cần đăng ký công khai (quản lý bởi giáo viên/admin qua portal nội bộ), và hỗ trợ triển khai Cloudflare.

---

## 🏗️ Cấu trúc Monorepo (Turborepo)

```text
qna_learning/
├── apps/
│   ├── web/               # Ứng dụng ôn tập cho học viên (Next.js App Router -> Triển khai Cloudflare)
│   └── admin/             # Trang quản trị nội bộ chạy local (Quản lý user, soft-ban, đổi MK, upload & sửa đề)
├── packages/
│   ├── database/          # SQL schema Supabase, RLS policies, helpers & 90 câu hỏi mẫu QNA Learning
│   ├── types/             # Kiểu dữ liệu TypeScript dùng chung (Quiz, Question, User, Attempt)
│   └── ui/                # Theme DaisyUI (Light/Dark), icons (Lucide + Thiings SVG), SafeContainer
├── package.json
└── turbo.json
```

---

## ⚡ Các tính năng nổi bật

### 1. Ứng dụng học viên (`apps/web`) - Triển khai Cloudflare
- **iOS Optimized**: Hỗ trợ safe-area-inset (`viewport-fit=cover`), touch feedback tức thì, font Quicksand & Be Vietnam Pro sắc nét, không bị giật lag hay auto-zoom trên iPhone.
- **DaisyUI Theme**: Chế độ Sáng (nền giấy ngà thanh lịch `#FDF6F3`, đỏ vang `#8B1E28`, điểm xuyết vàng `#D9A875`) và Tối (`#1B1213`, `#E07A82`).
- **Icons**: Kết hợp biểu tượng Lucide và bộ huy hiệu/cup phong cách tactile SVG từ [thiings.co/things](https://www.thiings.co/things).
- **Quy trình làm bài & Luyện tập**:
  - Chọn bài ôn tập (chọn từng bài hoặc tất cả).
  - Tùy chọn số lượng câu (20 câu, 25 câu, toàn bộ hoặc tự chọn số câu).
  - Câu hỏi & thứ tự 4 đáp án A/B/C/D đảo ngẫu nhiên mỗi lượt.
  - Phản hồi tức thì: Chọn đúng ngay được cộng điểm; chọn sai được chọn lại đến khi đúng; mở hộp giải thích chi tiết và trích dẫn tài liệu gốc.
  - Bảng câu hỏi dạng lưới modal/drawer tiện lợi theo dõi tiến độ.
  - Màn hình kết quả: Chấm điểm thang 10, thống kê thời gian làm bài, tỷ lệ theo từng bài học, bộ lọc câu đúng / câu sai, và nút **"Làm lại câu sai"** hoặc **"Làm lại toàn bộ lượt này"**.
- **Không đăng ký tự do**: Học viên đăng nhập bằng tài khoản được cấp; middleware tự động kiểm tra soft-ban.

### 2. Trang quản trị nội bộ (`apps/admin`) - Chạy Local
- **Quản lý học viên & Soft-ban**:
  - Tạo tài khoản học viên trực tiếp (Email, Mật khẩu, Tên hiển thị) qua Supabase Admin API không cần verify email rườm rà.
  - Nút bật/tắt **Tạm khóa (Soft-ban)** ngay lập tức: tài khoản bị khóa sẽ không thể đăng nhập hoặc làm bài.
  - Đổi mật khẩu học viên nhanh chóng trong modal.
- **Upload đề vào Storage & Đồng bộ Database**:
  - Upload file `.json` câu hỏi vào Supabase Storage bucket `quiz-files`.
  - Tự động parse và import vào bảng `lessons` và `questions`.
  - Nút **"Nạp 90 câu mẫu"**: 1 click nạp toàn bộ 90 câu QNA Learning vào cơ sở dữ liệu.
- **Biên tập & Chỉnh sửa câu hỏi**:
  - Tìm kiếm câu hỏi, lọc theo bài học.
  - Chỉnh sửa nội dung câu hỏi, 4 phương án A/B/C/D, chọn đáp án đúng, sửa giải thích và trích dẫn.
  - Thêm câu hỏi mới hoặc xóa câu hỏi.

---

## 🚀 Hướng dẫn cài đặt & Chạy dự án

### Bước 1: Khởi tạo Database trên Supabase
1. Vào dự án Supabase của bạn -> **SQL Editor**.
2. Sao chép toàn bộ nội dung file `packages/database/src/schema.sql` và nhấn **Run**.
   *(Script sẽ tự động tạo bảng `profiles`, `quiz_sets`, `lessons`, `questions`, `quiz_attempts`, trigger tạo user, storage bucket `quiz-files` và các chính sách RLS bảo mật)*.

### Bước 2: Thiết lập biến môi trường (Environment Variables)

#### 1. Cho app Learner Web (`apps/web/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 2. Cho app Admin Local (`apps/admin/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
*(Lưu ý: `SUPABASE_SERVICE_ROLE_KEY` chỉ đặt ở admin chạy local, không public lên web).*

---

### Bước 3: Lệnh chạy

```bash
# Cài đặt toàn bộ dependencies (pnpm)
pnpm install

# Build kiểm tra toàn bộ monorepo
pnpm build

# Chạy app học viên Web (cổng 3000)
pnpm dev:web

# Chạy app Admin Portal nội bộ (cổng 3001)
pnpm dev:admin

# Hoặc chạy song song cả 2 app:
pnpm dev
```

Truy cập:
- App học viên: `http://localhost:3000`
- Admin portal: `http://localhost:3001`

---

## ☁️ Triển khai lên Cloudflare (`apps/web`)

App `@qna/web` đã được tối ưu hóa siêu nhẹ (First Load JS ~152 kB) và sẵn sàng cho Cloudflare Pages / Workers:

```bash
cd apps/web
# Build Pages output
pnpm pages:build

# Triển khai trực tiếp qua Wrangler
npx wrangler pages deploy .vercel/output/static
```

Hoặc liên kết repo GitHub với Cloudflare Pages:
- **Build command**: `pnpm build` hoặc `npx @cloudflare/next-on-pages`
- **Build output directory**: `.vercel/output/static`
- **Environment variables**: Thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
