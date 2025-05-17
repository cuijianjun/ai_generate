#!/bin/bash

echo "正在启动国内空号生成工具服务器..."
echo
echo "请选择启动方式:"
echo "1. 使用Python HTTP服务器 (需要已安装Python)"
echo "2. 使用Node.js HTTP服务器 (需要已安装Node.js)"
echo

read -p "请输入选择(1或2): " choice

if [ "$choice" = "1" ]; then
    echo "使用Python启动..."
    python -m http.server 8080
elif [ "$choice" = "2" ]; then
    echo "使用Node.js启动..."
    npx http-server -p 8080
else
    echo "无效的选择，将尝试Python方式..."
    python -m http.server 8080
fi 