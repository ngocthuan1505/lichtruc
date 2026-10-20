# Lịch Trực Cư Xá

Web tĩnh bằng HTML/JavaScript, chạy trên GitHub Pages. Dữ liệu dùng chung nằm trong Firebase Realtime Database; thay đổi trên một thiết bị được cập nhật sang các thiết bị khác.

## Sử dụng

- Quản lý thành viên, lịch bận và nghỉ dài hạn.
- Xếp lịch tự động hoặc chỉnh từng ca; mỗi người tối đa một ca trong ngày.
- Chấm hoàn thành/bùng trực rồi chốt tuần để cập nhật thống kê và lịch sử.
- Ca bù/phạt được tính riêng, không cộng vào số ca hoàn thành thông thường.
- Khi xếp lại/xóa lịch, hoặc chốt ca bù chưa hoàn thành/ngày nghỉ, khoản nợ được hoàn trả.
- Hai thiết bị sửa cùng lúc: bản ghi có phiên bản cũ bị từ chối; có thể tải bản sửa chưa đồng bộ để đối chiếu.
- Tải JSON trong mục sao lưu trước khi nhập dữ liệu hoặc chốt tuần. Nhập JSON sẽ thay dữ liệu dùng chung.

## Kiểm tra

Tại thư mục gốc, dùng Node.js để chạy:

```
node tests/sync.cjs
node tests/logic.cjs
```

Không cần cài dependency. Kiểm thử dùng dữ liệu giả, không ghi lên Firebase thật.

## Triển khai

GitHub Pages phục vụ nhánh `main`, thư mục gốc. File `.nojekyll` giữ chế độ phục vụ file tĩnh.
Thay đổi `index.html` trên `main` sẽ được GitHub Pages triển khai theo cấu hình repo.

## Giới hạn

Chế độ công khai được chọn cho cư xá: không có đăng nhập/phân quyền quản trị, ai biết địa chỉ đều có thể đọc và sửa dữ liệu.
Kiểm tra phiên bản ngăn ghi đè vô ý giữa các phiên bản ứng dụng mới; không ngăn người có quyền ghi trực tiếp vào Firebase.
Các bản web cũ không dùng transaction vẫn có thể ghi đè, nên mọi người cần tải lại bản mới khi cập nhật.

Ứng dụng cần mạng để nhận/gửi dữ liệu chung. Bản sửa lưu lỗi được giữ trong trình duyệt và có thể tải JSON; không tự trộn dữ liệu khi xung đột.
Giới hạn 25 thành viên và lưu tối đa 20 tuần lịch sử. Chưa kiểm thử trên iPhone thật.
