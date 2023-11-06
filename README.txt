1. Vào "https://console.cloud.google.com/apis/library/sheets.googleapis.com". Enable API hoặc Manage
Xong vào tab Credentials -> Manage service accounts. 
Tạo service accounts mới với role owner. 
Xong vào cài đặt service account đấy, nhấn Keys -> Add keys -> Create new keys -> JSON
File vừa tải về đổi tên thành jwt.json rồi lưu vào thư mục này

2. Điền các thông tin cần thiết vào trong file .envexample theo mẫu rồi đổi tên thành .env

- CLIENTID: Điền ID của bot
- GUILDID: Điền ID máy chủ mà bạn sẽ chạy bot
- MONGOURL: Điền URL để kết nối database Mongo
+ Tạo tài khoản MongoDB
+ Tạo database mới, vào mục connect -> driver -> copy link connect ra ngoài. Để ý có phần <password>, là nơi bạn sẽ điền password cho user của bạn
+ Bên phải chọn database access, tìm user có sẵn trong đấy. Nhấn vào edit, kiểm tra user có quyền "read and write to any database" không trong mục "Built in role". Tạo mật khẩu mới rồi thay vào phần <password> trong link ở trên.
+ URL hiện tại sẽ được cho vào mục MONGOURL
- TOKEN: Token của bot (lấy trong Discord Developer)

2. Lên GitHub tạo một repository mới, đặt tên tùy ý. Repository bắt buộc phải để riêng tư đề phòng token bị lộ ra ngoài

3. Tải GitHub Destop về, clone repository mới tạo. 

4. Copy hết mọi file từ thư mục này sang thư mục của repository mà bạn vừa clone

5. Đăng repository cùng file lên Discord

6. Vào Heroku, tạo project mới

7. Vào trong Settings, Config Vars, Reveal Config Vars và thêm key với value tương tự như trong file .env cho từng mục (VD: key: CLIENTID, value: 324523423432)

7. Vào tab deploy trong project, chọn GitHub, rồi search để tìm repo vừa nãy. Nhấn Deploy Branch

8. Check xem command đã hiển thị trong server chưa. Nếu chưa thì nhấn More -> Restart all dynos hoặc đợi. Nếu rồi thì vào tab Resources, nhấn vào hình cây bút, tắt web đi, bật worker lên rồi confirm
