#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空号生成工具 - 主程序
用于生成随机的中国大陆手机空号
"""

import random
import json
import csv
import argparse
import os
import sys
import time
from datetime import datetime
import hashlib
from typing import Dict, List, Set, Tuple, Optional, Union, Any

# 定义中国三大运营商的号段前缀
MOBILE_PREFIXES = [
    "134", "135", "136", "137", "138", "139", "147", "148", "149", "150", "151", "152", 
    "157", "158", "159", "165", "172", "178", "182", "183", "184", "187", "188", "195", 
    "196", "197", "198"
]

UNICOM_PREFIXES = [
    "130", "131", "132", "145", "146", "155", "156", "166", "167", "171", "175", "176", 
    "185", "186", "196"
]

TELECOM_PREFIXES = [
    "133", "149", "153", "173", "174", "177", "180", "181", "189", "190", "191", "192", 
    "193", "199"
]

# 避免使用的特殊号码模式
SPECIAL_PATTERNS = [
    r'(\d)\1{5,}',  # 6个或更多相同数字
    r'12345',       # 连续顺序数字
    r'54321',       # 连续倒序数字
    r'(\d)(\d)(\d)\3\2\1',  # 回文
]

# 空号生成器类
class PhoneGenerator:
    """国内手机空号生成器"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化手机号生成器
        
        Args:
            config: 配置参数，可包含:
                - operator: 运营商类型 ('all', 'mobile', 'unicom', 'telecom')
                - region: 归属地区域 (暂未实现)
                - prefix: 指定号码前缀
                - pattern: 特殊号码模式
        """
        self.config = config or {}
        self.generated_numbers: Set[str] = set()  # 用于存储已生成的号码，确保唯一性
        self.operator = self.config.get('operator', 'all')
        self.prefix = self.config.get('prefix', None)
        self.pattern = self.config.get('pattern', {})
        
        # 根据运营商选择可用的号段前缀
        self.available_prefixes = self._get_available_prefixes()
        
        # 加载已知的分配号段 (实际应用中需要从数据库或配置文件加载)
        self.allocated_prefixes = set()  # 这里仅为示例，实际应用中需要填充真实数据
        
    def _get_available_prefixes(self) -> List[str]:
        """根据运营商配置获取可用的号段前缀"""
        if self.prefix:
            # 如果指定了前缀，验证前缀是否有效
            return [self.prefix] if self._is_valid_prefix(self.prefix) else []
            
        if self.operator == 'mobile':
            return MOBILE_PREFIXES
        elif self.operator == 'unicom':
            return UNICOM_PREFIXES
        elif self.operator == 'telecom':
            return TELECOM_PREFIXES
        else:  # 'all' 或其他值
            return MOBILE_PREFIXES + UNICOM_PREFIXES + TELECOM_PREFIXES
    
    def _is_valid_prefix(self, prefix: str) -> bool:
        """验证前缀是否是有效的运营商号段前缀"""
        all_prefixes = MOBILE_PREFIXES + UNICOM_PREFIXES + TELECOM_PREFIXES
        
        # 检查完整前缀
        if prefix in all_prefixes:
            return True
            
        # 检查部分前缀 (如 '13')
        if any(valid_prefix.startswith(prefix) for valid_prefix in all_prefixes):
            return True
            
        return False
    
    def _is_special_pattern(self, number: str) -> bool:
        """检查号码是否符合特殊模式 (如过多重复、顺序等)"""
        # 检查是否包含要排除的数字
        exclude_digits = self.pattern.get('exclude', [])
        if any(digit in number for digit in exclude_digits):
            return True
            
        # 检查尾号是否需要特定数字
        tail = self.pattern.get('tail', None)
        if tail and not number.endswith(tail):
            return True
            
        # 检查是否有过多重复数字
        if len(set(number)) < 4:  # 如果不同数字少于4个
            return True
            
        # 检查是否有连续相同数字
        for i in range(len(number) - 3):
            if number[i] == number[i+1] == number[i+2] == number[i+3]:
                return True
                
        # 检查是否是顺序数字
        if '1234' in number or '2345' in number or '3456' in number or \
           '4567' in number or '5678' in number or '6789' in number or \
           '9876' in number or '8765' in number or '7654' in number or \
           '6543' in number or '5432' in number or '4321' in number:
            return True
            
        return False
    
    def _is_empty_number(self, number: str) -> bool:
        """
        判断号码是否为空号 (此处为模拟实现)
        
        实际应用中，需要:
        1. 检查号码是否在已知分配的号段内
        2. 可选地调用第三方API进行验证
        
        此处简化处理，返回一个基于号码特征的概率判断
        """
        # 模拟判断逻辑 - 实际应用需要替换为真实的判断方法
        
        # 检查是否为已知分配的号段
        if number[:7] in self.allocated_prefixes:
            return False
            
        # 对于特殊号码 (如全相同尾号，顺序号码等)，大概率已被分配
        if self._is_special_pattern(number):
            return random.random() < 0.2  # 20%概率是空号
        
        # 普通号码有较高概率是空号
        return random.random() < 0.95  # 95%概率是空号
    
    def generate_one(self) -> Optional[str]:
        """生成一个随机空号"""
        if not self.available_prefixes:
            return None
            
        # 最多尝试50次生成
        for _ in range(50):
            # 随机选择一个前缀
            prefix = random.choice(self.available_prefixes)
            
            # 生成剩余8位数字
            suffix = ''.join(random.choice('0123456789') for _ in range(11 - len(prefix)))
            
            # 组合完整号码
            number = prefix + suffix
            
            # 检查是否符合尾号要求
            tail = self.pattern.get('tail')
            if tail and not number.endswith(tail):
                continue
                
            # 检查唯一性
            if number in self.generated_numbers:
                continue
                
            # 检查是否为空号
            if self._is_empty_number(number):
                self.generated_numbers.add(number)
                return number
                
        return None  # 如果多次尝试都失败，返回None
    
    def generate_batch(self, count: int) -> List[Dict[str, str]]:
        """
        批量生成指定数量的空号
        
        Args:
            count: 要生成的空号数量
            
        Returns:
            包含号码及元数据的字典列表
        """
        result = []
        start_time = time.time()
        
        for i in range(count):
            if i % 100 == 0 and i > 0:
                print(f"已生成 {i}/{count} 个号码...")
                
            phone = self.generate_one()
            if phone:
                # 确定运营商
                operator = self._determine_operator(phone)
                
                # 添加到结果列表
                result.append({
                    'number': phone,
                    'operator': operator,
                    'region': '未知',  # 此处可扩展为真实归属地查询
                    'timestamp': datetime.now().isoformat()
                })
            
            # 超时保护
            if time.time() - start_time > 30:  # 超过30秒
                print(f"警告: 生成超时，已生成 {len(result)}/{count} 个号码")
                break
                
        return result
    
    def _determine_operator(self, phone: str) -> str:
        """根据手机号前3位确定运营商"""
        prefix3 = phone[:3]
        
        if prefix3 in MOBILE_PREFIXES:
            return "移动"
        elif prefix3 in UNICOM_PREFIXES:
            return "联通"
        elif prefix3 in TELECOM_PREFIXES:
            return "电信"
        else:
            return "未知"

    def save_to_file(self, numbers: List[Dict[str, str]], output_format: str, file_path: Optional[str] = None) -> str:
        """
        将生成的号码保存到文件
        
        Args:
            numbers: 号码列表
            output_format: 输出格式 ('text', 'csv', 'json')
            file_path: 输出文件路径，如果未指定则自动生成
            
        Returns:
            保存的文件路径
        """
        if not file_path:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_path = f"phone_numbers_{timestamp}.{output_format}"
            
        try:
            if output_format == 'text':
                with open(file_path, 'w', encoding='utf-8') as f:
                    for item in numbers:
                        f.write(f"{item['number']},{item['operator']},{item['region']}\n")
                        
            elif output_format == 'csv':
                with open(file_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['号码', '运营商', '归属地', '生成时间'])
                    for item in numbers:
                        writer.writerow([
                            item['number'], 
                            item['operator'], 
                            item['region'],
                            item['timestamp']
                        ])
                        
            elif output_format == 'json':
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'numbers': numbers,
                        'metadata': {
                            'count': len(numbers),
                            'timestamp': datetime.now().isoformat(),
                            'config': self.config
                        }
                    }, f, ensure_ascii=False, indent=2)
            else:
                raise ValueError(f"不支持的输出格式: {output_format}")
                
            return file_path
            
        except Exception as e:
            print(f"保存文件时出错: {e}")
            return ""


def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='国内手机空号生成工具')
    
    parser.add_argument('--count', type=int, default=10,
                        help='要生成的空号数量 (默认: 10)')
    parser.add_argument('--operator', choices=['all', 'mobile', 'unicom', 'telecom'],
                        default='all', help='运营商类型 (默认: all)')
    parser.add_argument('--prefix', type=str, help='指定号码前缀')
    parser.add_argument('--pattern', type=str, help='特殊号码模式，JSON格式，如: \'{"tail":"8888"}\'')
    parser.add_argument('--output', choices=['text', 'csv', 'json'],
                        default='text', help='输出格式 (默认: text)')
    parser.add_argument('--path', type=str, help='输出文件路径')
    
    return parser.parse_args()


def main():
    """主函数"""
    # 解析命令行参数
    args = parse_arguments()
    
    # 解析特殊模式
    pattern = {}
    if args.pattern:
        try:
            pattern = json.loads(args.pattern)
        except json.JSONDecodeError:
            print(f"错误: 无效的pattern格式: {args.pattern}")
            sys.exit(1)
    
    # 创建配置
    config = {
        'operator': args.operator,
        'prefix': args.prefix,
        'pattern': pattern
    }
    
    # 创建生成器
    generator = PhoneGenerator(config)
    
    print(f"开始生成 {args.count} 个空号...")
    start_time = time.time()
    
    # 生成号码
    numbers = generator.generate_batch(args.count)
    
    # 计算生成时间
    elapsed = time.time() - start_time
    
    # 保存到文件
    if numbers:
        file_path = generator.save_to_file(numbers, args.output, args.path)
        
        print(f"成功生成 {len(numbers)} 个空号，耗时 {elapsed:.2f} 秒")
        print(f"结果已保存至: {file_path}")
        
        # 打印部分示例
        print("\n示例号码:")
        for i, item in enumerate(numbers[:5]):
            print(f"{i+1}. {item['number']} ({item['operator']})")
        
        if len(numbers) > 5:
            print(f"... 等共 {len(numbers)} 个号码")
    else:
        print("未能生成有效的空号")


if __name__ == "__main__":
    main() 