# RunGear Store - Premium Running Shoes Storefront

Ứng dụng web bán giày chạy bộ cao cấp xây dựng bằng cấu trúc Fullstack (ExpressJS + ReactJS + MongoDB).

---

## 🌟 Tính Năng Đặc Biệt: Hybrid Database Fallback
Dự án được tích hợp cơ chế tự động chuyển đổi thông minh:
* **Khi kết nối thành công với MongoDB**: Ứng dụng tự động khởi tạo dữ liệu mẫu (Auto-seeding) cho sản phẩm và phân mục, truy vấn và ghi nhận dữ liệu thật.
* **Khi MongoDB không khả dụng (không thể kết nối hoặc không cài đặt)**: Hệ thống sẽ tự động chuyển sang chế độ **In-Memory Fallback** (sử dụng cơ sở dữ liệu giả lập trong RAM). Mọi chức năng: Đăng ký, Đăng nhập, Xem sản phẩm, Giỏ hàng, Đặt đơn hàng và Theo dõi đơn hàng thời gian thực vẫn hoạt động hoàn hảo mà không bị lỗi crash máy chủ!

---

## 🔑 Tài khoản thử nghiệm mặc định (Chế độ Fallback RAM)
Nếu bạn đang chạy ứng dụng ở chế độ giả lập không có MongoDB, bạn có thể sử dụng trực tiếp các tài khoản được cài đặt sẵn sau:

| Vai trò (Role) | Email | Mật khẩu (Password) | Chức năng kiểm thử |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@rungear.com` | `adminpassword` | Vào được tab **Quản lý đơn** (Shop) để thay đổi trạng thái và duyệt yêu cầu hủy. |
| **Thành viên thường (USER)** | `user@rungear.com` | `userpassword` | Mua hàng, Giỏ hàng, Thanh toán, Theo dõi hành trình đơn hàng. |

---

## 🛠️ Hướng dẫn khởi chạy dự án

### Bước 1: Khởi động Backend (ExpressJS API)
1. Di chuyển vào thư mục backend:
   ```bash
   cd ExpressJS01
   ```
2. Cài đặt các gói phụ thuộc (nếu là lần đầu):
   ```bash
   npm install
   ```
3. Tạo file `.env` (đã cấu hình sẵn, mặc định kết nối tới `mongodb://localhost:27017/fullstack02`).
4. Chạy server ở chế độ phát triển:
   ```bash
   npm run dev
   ```
   *Máy chủ sẽ chạy tại cổng **8080** (http://localhost:8080).*

### Bước 2: Khởi động Frontend (ReactJS + Vite)
1. Di chuyển vào thư mục frontend:
   ```bash
   cd ReactJS01/reactjs01
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Chạy client:
   ```bash
   npm run dev
   ```
   *Giao diện người dùng sẽ chạy tại cổng **5173** (http://localhost:5173).*

---

## 🛒 Quy trình các chức năng chính đã triển khai
1. **Giỏ hàng**: Chọn kích thước, màu sắc và số lượng trên trang chi tiết sản phẩm. Số lượng giỏ hàng trên Header tự động đồng bộ.
2. **Thanh toán**: Hỗ trợ ship COD (bắt buộc) và giả lập cổng thanh toán **Ví MoMo** (quét mã QR) cùng **VNPAY** (thẻ ngân hàng) cực kỳ trực quan.
3. **Theo dõi hành trình đơn hàng**: 
   * Hiển thị tiến trình bằng thanh trạng thái (Steps) thời gian thực.
   * Đơn mới tự động duyệt sau 30 phút.
   * Tích hợp đồng hồ đếm ngược 30 phút để hủy trực tiếp.
   * Hỗ trợ gửi yêu cầu hủy đơn cho shop nếu đơn đang chuẩn bị (bước 3).
4. **Quản lý shop (Admin)**: Quản trị viên duyệt tiến trình đơn và duyệt/từ chối yêu cầu hủy của khách hàng.
