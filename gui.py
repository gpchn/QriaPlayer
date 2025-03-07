import tkinter as tk
from tkinter import ttk, messagebox

root = tk.Tk()
app = GUI(root)
root.mainloop()

class GUI:
    def __init__(self, master):
        self.master = master
        master.title("Paio - Player All In One")
        master.geometry("800x500")

        # 初始化数据存储
        self.data_groups = {}  # {组号: 数据列表}
        self.current_group = 0

        # 创建主布局
        self.create_widgets()
        
    def create_widgets(self):
        # 左侧数据列表区域
        left_frame = ttk.Frame(self.master)
        left_frame.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=5, pady=5)

        # 使用Treeview实现带表格样式的列表
        self.data_list = ttk.Treeview(
            left_frame, 
            columns=('序号', '标题', '内容'), 
            show='headings',
            selectmode='browse'
        )
        
        # 配置列
        self.data_list.heading('序号', anchor='w', text='序号')
        self.data_list.heading('标题', anchor='w', text='标题')
        self.data_list.heading('内容', anchor='w', text='内容')
        
        # 设置列宽
        self.data_list.column('序号', width=50, minwidth=50)
        self.data_list.column('标题', width=150, minwidth=100)
        self.data_list.column('内容', width=400, minwidth=200)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(left_frame, orient=tk.VERTICAL, command=self.data_list.yview)
        self.data_list.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.data_list.pack(expand=True, fill=tk.BOTH)

        # 右侧控制面板
        right_frame = ttk.Frame(self.master, width=200)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=5, pady=5)

        # 爬取数量输入
        ttk.Label(right_frame, text="爬取数量:").pack(pady=5, anchor='w')
        self.count_entry = ttk.Entry(right_frame)
        self.count_entry.pack(fill=tk.X, pady=5)

        # 模拟爬取按钮
        self.crawl_btn = ttk.Button(right_frame, text="开始爬取", command=self.simulate_crawl)
        self.crawl_btn.pack(fill=tk.X, pady=10)

        # 下载选项
        ttk.Label(right_frame, text="选择组号:").pack(pady=5, anchor='w')
        self.group_combobox = ttk.Combobox(right_frame, state="readonly")
        self.group_combobox.pack(fill=tk.X, pady=5)

        # 下载按钮
        self.download_btn = ttk.Button(
            right_frame, 
            text="下载数据", 
            command=self.download_data,
            state=tk.DISABLED
        )
        self.download_btn.pack(fill=tk.X, pady=10)

    def simulate_crawl(self):
        """模拟爬取数据并更新界面"""
        try:
            count = int(self.count_entry.get())
            if count <= 0:
                raise ValueError
        except:
            messagebox.showerror("错误", "请输入有效的正整数")
            return

        # 生成模拟数据
        self.current_group += 1
        data = [
            (f"{self.current_group}-{i}", f"标题{i}", f"内容示例{i}") 
            for i in range(1, count+1)
        ]
        
        # 存储数据
        self.data_groups[self.current_group] = data
        
        # 更新数据列表
        self.update_data_list(data)
        
        # 更新下拉选项
        self.group_combobox['values'] = list(self.data_groups.keys())
        self.download_btn.config(state=tk.NORMAL)

    def update_data_list(self, data):
        """更新数据显示列表"""
        # 清空现有数据
        for item in self.data_list.get_children():
            self.data_list.delete(item)
        
        # 插入新数据
        for item in data:
            self.data_list.insert('', tk.END, values=item)

    def download_data(self):
        """处理下载操作"""
        selected_group = self.group_combobox.get()
        if not selected_group:
            messagebox.showwarning("警告", "请先选择要下载的组号")
            return
            
        # 这里可以添加实际的下载逻辑
        messagebox.showinfo(
            "下载成功", 
            f"已下载第 {selected_group} 组数据\n"
            f"包含 {len(self.data_groups[int(selected_group)])} 条记录"
        )