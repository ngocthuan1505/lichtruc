# Kiểm thử

Chạy từ thư mục gốc của repo:

```
node tests/sync.cjs
node tests/logic.cjs
```

Kiểm tra đồng bộ, xung đột khi hai thiết bị cùng ghi, sao lưu lỗi, hoàn trả nợ, tính điểm, xếp trùng ca, lịch bận/nghỉ dài hạn, tên có dấu nháy, dữ liệu không hợp lệ và xếp lịch lặp lại. Dùng dữ liệu giả và bộ mô phỏng Firebase, không ghi vào dữ liệu thật.
