# TODO.md – Évolution Backlog

## Đang thực hiện / Sắp tới

- [ ] Viết bộ test đầy đủ cho các thành phần Ink TUI (App, Input, MessageList, Modal, StatusBar, Toast, SessionSelector, SettingsSelector, ModelSelector, ThemeSelector, Keybindings)
- [ ] Viết test cho InteractiveController (lệnh slash, sự kiện runtime)
- [ ] Thêm kiểm tra nhập liệu dấu tiếng Việt
- [ ] Đo cobertura, bắt buộc đạt ≥80%
- [ ] Áp ràng buộc chiều dài hàm ≤20 và độ phức tạp ≤10 thông qua lint/CI

## Hoàn thành

- [x] Loại bỏ chế độ in/rpc, chỉ giữ chế độ TTY
- [x] Thay thế TUI tùy chỉnh bằng terminal thuần (không dùng giao diện readline)
- [x] Thêm lệnh slash `/model` kèm menu tương tác
- [x] Đảm bảo chỉ cho phép TTY (chặn chế độ pipe)
- [x] Tách chế độ TTY thành các module và thành phần/ (InputHandler, MenuSystem, CommandProcessor, PromptLine, OutputRenderer, ConfigManager, StatusBar)
- [x] Tạo `docs/PROJECT_STATE.md` (phiên bản đầu tiên)
- [x] Build thành công (`npm run build`)
- [x] Thêm kiểm thử đơn vị cho chế độ TTY (41 kiểm thử pass)
- [x] Sửa trình phân tích đối số CLI: xóa tùy chọn `--mode` cũ, thêm cảnh báo khi cấp độ suy nghĩ không hợp lệ
- [x] Tất cả kiểm thử pass (2308+)
- [x] Thêm lệnh `/login` (đặt khóa API)
- [x] OutputRenderer: màu sắc, markdown, thanh quay, tiến độ, khối mã
- [x] InputHandler: nhiều dòng, lịch sử, phím tắt sửa chữa, lịch sử bền vững
- [x] ConfigManager: cấu hình bền vững, đặt lại/khôi phục
- [x] Thêm lệnh `/sessions` (liệt kê, chuyển phiên)
- [x] Thêm lệnh `/settings` (xem/sửa cấu hình)
- [x] Thêm lệnh `/tools` (bật/tắt công cụ 내장)
- [x] Thêm lệnh `/theme` (chuyển màu chủ đề)
- [x] Port TUI Ink từ pi-mono: viết lại tất cả thành phần (Footer, MessageList, Input, Modal, StatusBar, Toast, SessionSelector, SettingsSelector, ModelSelector, ThemeSelector)
- [x] Viết lại InteractiveController: TypeScript thuần, xử lý lệnh slash, sự kiện runtime
- [x] Viết lại InteractiveMode: TypeScript thuần điều phối, kết nối runtime + giao diện Ink
- [x] Viết interactive-app.tsx: điểm vào Ink
- [x] Cập nhật main.ts: dùng TUI Ink làm chế độ mặc định
- [x] Thêm cuộn ảo cho danh sách tin nhắn
- [x] Thêm hiển thị markdown cho tin nhắn trợ lý
- [x] Thêm phím tắt (Ctrl+K, Ctrl+P, Ctrl+L, Ctrl+C)
- [x] Thêm hệ thống chủ đề (tối, sáng, matrix)
- [x] Thêm chế độ API HTTP với REST và WebSocket
- [x] Build và kiểm thử
- [x] Viết lại bố cục TUI Ink theo nguyên tắc pi-mono (tiêu đề cố định đầu màn hình, tin nhắn co giãn chiếm không gian còn lại, ô nhập liệu cố định đáy, thanh trạng thái dưới ô nhập liệu)
- [x] Thêm con trœur nhấp nháy `█` vào ô nhập liệu `Input`
- [x] Chỉ thành phần `Input` đăng ký `useInput`, gỡ khỏi `VirtualMessageList` để tránh xung đột phím
- [x] Thêm lệnh `npm run start` (chạy `node dist/cli.js`)
- [x] Cập nhật `npm run dev` tự động build rồi chạy `npm start` với `VERBOSE=1`
- [x] Thêm chế độ dự phòng readline REPL khi stdin không phải raw-mode TTY
- [x] Sửa lỗi giá trị `NaN` chiều cao khung nhìn khi `rows` chưa khởi tạo
- [x] Khóa ô nhập liệu ở đáy màn hình (`flexShrink={0}`) không bị cuộn lên

## Hoãn lại / Tương lai

- [ ] Thêm tùy chọn tham gia telemetry
- [ ] Triển khai xuất/nhập phiên làm việc

---

*Thứ tự ưu tiên tuân theo tác động lớn nhất, rủi ro thấp nhất trước tiên.*
