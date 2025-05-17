#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空号生成工具 - 主启动脚本
提供命令行和Web界面两种启动方式
"""

import os
import sys
import argparse
from phone_generator import PhoneGenerator, main as generator_main

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='国内手机空号生成工具')
    
    # 添加子命令
    subparsers = parser.add_subparsers(dest='command', help='运行模式')
    
    # CLI模式参数
    cli_parser = subparsers.add_parser('cli', help='命令行模式')
    cli_parser.add_argument('--count', type=int, default=10,
                        help='要生成的空号数量 (默认: 10)')
    cli_parser.add_argument('--operator', choices=['all', 'mobile', 'unicom', 'telecom'],
                        default='all', help='运营商类型 (默认: all)')
    cli_parser.add_argument('--prefix', type=str, help='指定号码前缀')
    cli_parser.add_argument('--pattern', type=str, help='特殊号码模式，JSON格式，如: \'{"tail":"8888"}\'')
    cli_parser.add_argument('--output', choices=['text', 'csv', 'json'],
                        default='text', help='输出格式 (默认: text)')
    cli_parser.add_argument('--path', type=str, help='输出文件路径')
    
    # Web模式参数
    web_parser = subparsers.add_parser('web', help='Web界面模式')
    web_parser.add_argument('--host', type=str, default='0.0.0.0',
                        help='监听地址 (默认: 0.0.0.0)')
    web_parser.add_argument('--port', type=int, default=5000,
                        help='监听端口 (默认: 5000)')
    web_parser.add_argument('--debug', action='store_true',
                        help='启用调试模式')
    
    return parser.parse_args()

def run_web_app(host='0.0.0.0', port=5000, debug=False):
    """运行Web应用"""
    try:
        # 尝试导入Flask应用
        from web_app import app
        print(f"启动Web应用，访问地址: http://{host if host != '0.0.0.0' else 'localhost'}:{port}")
        app.run(host=host, port=port, debug=debug)
    except ImportError as e:
        print(f"错误: 无法启动Web应用，缺少必要的依赖: {e}")
        print("请先安装依赖: pip install -r requirements.txt")
        sys.exit(1)

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_arguments()
    
    # 根据命令运行相应模式
    if args.command == 'cli' or args.command is None:
        # 命令行模式，直接调用generator_main()
        if args.command is None:
            print("未指定运行模式，默认使用命令行模式\n")
        generator_main()
    elif args.command == 'web':
        # Web界面模式
        run_web_app(args.host, args.port, args.debug)
    else:
        print(f"错误: 未知的命令 '{args.command}'")
        sys.exit(1)

if __name__ == "__main__":
    main() 