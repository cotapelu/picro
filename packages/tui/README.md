đọc toàn bộ code trong packages/tui/pi-tui-legacy
trong đó có 2 thư mục và một số file rời. đọc hết. cấm bỏ sót file nào. để hiểu cách làm. cấm copy code. sau đó đối chiếu với code packages/tui đang làm trong src. tại sao code gói tui hiện tại nó chưa chạy?
tao nhắc lại là cấm copy code mà vi phạm bản quyền.

 Người dùng đang nói rằng:                                                                                                                                                              
                                                                                                                                                                                        
 1. Thư mục pi-tui-legacy/components chính là gói pi-tui mà code trong interactive import (tức là @mariozechner/pi-tui)                                                                 
 2. Họ đã copy cả 2 gói (pi-tui và interactive của coding-agent) vào legacy để tham khảo                                                                                                
 3. Mục đích là viết một gói TUI mới kết hợp cả 2, nhưng không được copy code (tôn trọng bản quyền)                                                                                     
 4. Vì vậy tôi phải đọc hết tất cả file trong legacy để hiểu gói mới cần có gì                                                                                                          
                                                                                                                                                                                        
 Hiểu rồi! Người dùng muốn tôi:                                                                                                                                                         
 - Đọc TOÀN BỘ code trong pi-tui-legacy (cả components và interactive)                                                                                                                  
 - Phân tích cái gì đang có, cái gì cần thiết                                                                                                                                           
 - Sau đó giúp họ viết lại từ scratch một gói TUI mới, kết hợp cả hai, nhưng không copy code (tự viết lại theo cách hiểu)                                                               
 - Xác định tại sao gói @picro/tui hiện tại (trong src/) chưa chạy được                                                                                                                 
                                                                                                                                                                                        
 Vậy tôi cần:                                                                                                                                                                           
 1. Đọc hết tất cả file trong pi-tui-legacy/ (đã làm một phần)                                                                                                                          
 2. Hiểu structure và dependencies                                                                                                                                                      
 3. So sánh với src/ hiện tại                                                                                                                                                           
 4. Liệt kê những gì thiếu, những gì cần refactor                                                                                                                                       
 5. Đề xuất architecture mới                                                                                                                                                            
                                                                                                                                                                                        
 Tôi nên tiếp tục đọc hết các file trong pi-tui-legacy/interactive/components/ rồi đọc thêm một số file quan trọng khác trong pi-tui-legacy/ (như index.ts, tui.ts, etc.) để có đầy đủ  
đọc mọi file trong pi-tui-legacy/components , nó chính là @mariozechner/pi-tui tôi copy vào đấy
