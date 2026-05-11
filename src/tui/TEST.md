YÊU CẦU CỤ THỂ VỀ THƯ MỤC TUI                                                                                                                                                          
                                                                                                                                                                                        
 Dựa trên những gì bạn nói, tôi tổng hợp yêu cầu:                                                                                                                                       
                                                                                                                                                                                        
 ✅ ĐÃ LÀM:                                                                                                                                                                             
                                                                                                                                                                                        
 1. ✅ Test full thư mục src/tui/ - Kết quả: 30 tests passed                                                                                                                            
 2. ✅ Xác định có 1 test file duy nhất: src/tui/interactive-mode.test.ts                                                                                                               
                                                                                                                                                                                        
 ❌ CÒN PHẢI LÀM:                                                                                                                                                                       
                                                                                                                                                                                        
 1. ❌ Viết THÊM test cases cho các component chưa được test trong src/tui/                                                                                                             
 2. ❌ Test TOÀN BỘ atoms (60 files) - hiện tại chưa có test nào riêng cho atoms                                                                                                        
 3. ❌ Test TOÀN BỘ molecules (26 files) - chưa có test riêng                                                                                                                           
 4. ❌ Test TOÀN BỘ organisms (8 files) - chưa có test riêng (chỉ test interactive-mode)                                                                                                
 5. ❌ Test các file lẻ như tui.ts, extension-ui-context.ts, index.ts                                                                                                                   
 6. ❌ Test mọi method trong mỗi class                                                                                                                                                  
 7. ❌ Test mọi luồng (render, key events, mouse, resize, etc.)                                                                                                                         
 8. ❌ Test mọi edge case (empty state, errors, boundary conditions)                                                                                                                    
                                                                                                                                                                                        
 🎯 MỤC TIÊU:                                                                                                                                                                           
                                                                                                                                                                                        
 - Bao phủ 100% code TUI với unit tests                                                                                                                                                 
 - Mỗi file/class có ít nhất một test suite                                                                                                                                             
 - Test đầy đủ: unit, integration, edge cases           
