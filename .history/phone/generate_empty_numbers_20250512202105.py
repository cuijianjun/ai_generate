#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
空号生成工具
用于生成符合中国大陆手机号格式的空号（未被使用的电话号码）
"""

import random
import argparse
import csv
import os
import time
from datetime import datetime
import json
from typing import List, Dict, Set, Optional, Tuple, Union

# 支持的输出格式
OUTPUT_FORMATS = ["text", "csv", "excel", "json"]

# 运营商号段配置
OPERATOR_PREFIXES = {
    "mobile": [
        "134", "135", "136", "137", "138", "139", "147", "148", "149", "150", 
        "151", "152", "157", "158", "159", "165", "172", "178", "182", "183", 
        "184", "187", "188", "195", "196", "197", "198"
    ],
    "unicom": [
        "130", "131", "132", "145", "146", "155", "156", "166", "167", "171", 
        "175", "176", "185", "186", "196"
    ],
    "telecom": [
        "133", "149", "153", "173", "174", "177", "180", "181", "189", "190", 
        "191", "192", "193", "199"
    ]
}

# 特殊号段，应避免使用的号段（示例，实际使用时应更新为真实的特殊号段）
SPECIAL_PREFIXES = {
    "test": ["1700", "1701", "1702"],  # 测试号段
    "reserved": ["1000", "1001"],  # 保留号段
    "pattern": []  # 有特定规律的号段
}

# 已知分配的号段（示例，实际使用时应通过API或数据库获取真实的已分配号段）
# 在实际应用中，可能需要接入运营商API或第三方服务来验证
ALLOCATED_PREFIXES = set()

class PhoneNumberGenerator:
    """手机号码生成器类"""
    
    def __init__(self):
        """初始化生成器"""
        self.generated_numbers: Set[str] = set()
        self.operator_map: Dict[str, str] = self._build_operator_map()
        
    def _build_operator_map(self) -> Dict[str, str]:
        """构建号段与运营商的映射关系"""
        operator_map = {}
        for operator, prefixes in OPERATOR_PREFIXES.items():
            for prefix in prefixes:
                operator_map[prefix] = operator
        return operator_map
    
    def is_valid_prefix(self, prefix: str) -> bool:
        """检查前缀是否有效"""
        if len(prefix) < 3:
            return False
        
        first_three = prefix[:3]
        for operator_prefixes in OPERATOR_PREFIXES.values():
            if first_three in operator_prefixes:
                return True
        return False
    
    def is_special_number(self, number: str) -> bool:
        """检查是否为特殊号码"""
        # 检查是否在特殊号段列表中
        for category, prefixes in SPECIAL_PREFIXES.items():
            for prefix in prefixes:
                if number.startswith(prefix):
                    return True
        
        # 检查是否有规律性（例如：连续数字、重复数字等）
        if self._has_pattern(number):
            return True
            
        return False
    
    def _has_pattern(self, number: str) -> bool:
        """检查号码是否有明显的规律"""
        # 检查连续数字（如：12345）
        for i in range(len(number) - 4):
            if all(int(number[i+j+1]) - int(number[i+j]) == 1 for j in range(4)):
                return True
                
        # 检查重复数字（如：aaaa）
        for i in range(len(number) - 3):
            if len(set(number[i:i+4])) == 1:
                return True
                
        # 检查数字对（如：ababab）
        if len(number) >= 6:
            for i in range(len(number) - 5):
                if (number[i] == number[i+2] == number[i+4] and 
                    number[i+1] == number[i+3] == number[i+5]):
                    return True
        
        return False
    
    def is_allocated(self, number: str) -> bool:
        """检查号码是否已被分配（在实际应用中需要接入验证API）"""
        # 此处为示例实现，实际应用中可能需要调用外部API或查询数据库
        # 返回 False 表示号码未被分配（即为空号）
        for prefix in ALLOCATED_PREFIXES:
            if number.startswith(prefix):
                return True
        return False
    
    def get_operator(self, number: str) -> str:
        """获取号码对应的运营商"""
        prefix = number[:3]
        return self.operator_map.get(prefix, "unknown")
    
    def generate_number(self, operator: str = "all", prefix: Optional[str] = None) -> str:
        """
        生成一个随机的手机号码
        
        参数:
        operator (str): 运营商类型 ("all", "mobile", "unicom", "telecom")
        prefix (str, optional): 指定的号码前缀
        
        返回:
        str: 生成的手机号码
        """
        if prefix and len(prefix) > 7:
            raise ValueError("前缀长度不能超过7位")
        
        if prefix and not prefix.isdigit():
            raise ValueError("前缀必须为数字")
            
        # 如果指定了前缀，检查其有效性
        if prefix:
            if len(prefix) >= 3 and not self.is_valid_prefix(prefix):
                raise ValueError(f"无效的前缀: {prefix}")
        
        available_prefixes = []
        if operator == "all":
            available_prefixes = (OPERATOR_PREFIXES["mobile"] + 
                                 OPERATOR_PREFIXES["unicom"] + 
                                 OPERATOR_PREFIXES["telecom"])
        elif operator in OPERATOR_PREFIXES:
            available_prefixes = OPERATOR_PREFIXES[operator]
        else:
            raise ValueError(f"无效的运营商: {operator}")
        
        if prefix:
            # 如果指定了前缀，验证前缀是否属于选定的运营商
            if len(prefix) >= 3:
                prefix_3 = prefix[:3]
                if prefix_3 not in available_prefixes:
                    raise ValueError(f"前缀 {prefix} 不属于指定的运营商 {operator}")
                available_prefixes = [prefix_3]
        
        max_attempts = 100  # 防止无限循环
        attempts = 0
        
        while attempts < max_attempts:
            attempts += 1
            
            # 选择前缀
            if prefix:
                number = prefix
            else:
                number = random.choice(available_prefixes)
            
            # 补全号码
            remaining_digits = 11 - len(number)
            for _ in range(remaining_digits):
                number += str(random.randint(0, 9))
            
            # 检查号码是否已生成、是否特殊号码、是否已分配
            if (number not in self.generated_numbers and 
                not self.is_special_number(number) and 
                not self.is_allocated(number)):
                self.generated_numbers.add(number)
                return number
        
        raise RuntimeError("无法生成满足条件的号码，请尝试放宽条件")
    
    def generate_batch(self, 
                      count: int = 1, 
                      operator: str = "all", 
                      prefix: Optional[str] = None) -> List[Dict[str, str]]:
        """
        批量生成空号
        
        参数:
        count (int): 要生成的空号数量
        operator (str): 运营商类型
        prefix (str, optional): 指定的号码前缀
        
        返回:
        List[Dict[str, str]]: 生成的空号列表，每个项目包含号码和运营商信息
        """
        if count < 1 or count > 10000:
            raise ValueError("生成数量必须在1-10000之间")
            
        result = []
        for _ in range(count):
            number = self.generate_number(operator, prefix)
            result.append({
                "number": number,
                "operator": self.get_operator(number),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        
        return result

def save_to_text(numbers: List[Dict[str, str]], filename: str):
    """保存为文本文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        for item in numbers:
            f.write(f"{item['number']} - {item['operator']}\n")
    
def save_to_csv(numbers: List[Dict[str, str]], filename: str):
    """保存为CSV文件"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["number", "operator", "timestamp"])
        writer.writeheader()
        writer.writerows(numbers)

def save_to_json(numbers: List[Dict[str, str]], filename: str):
    """保存为JSON文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(numbers, f, ensure_ascii=False, indent=2)

def save_to_excel(numbers: List[Dict[str, str]], filename: str):
    """保存为Excel文件"""
    try:
        import pandas as pd
        df = pd.DataFrame(numbers)
        df.to_excel(filename, index=False)
    except ImportError:
        print("Warning: pandas not installed, falling back to CSV format")
        save_to_csv(numbers, filename.replace('.xlsx', '.csv'))

def save_result(numbers: List[Dict[str, str]], output_format: str):
    """根据指定格式保存结果"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    if output_format == "text":
        filename = f"empty_numbers_{timestamp}.txt"
        save_to_text(numbers, filename)
    elif output_format == "csv":
        filename = f"empty_numbers_{timestamp}.csv"
        save_to_csv(numbers, filename)
    elif output_format == "json":
        filename = f"empty_numbers_{timestamp}.json"
        save_to_json(numbers, filename)
    elif output_format == "excel":
        filename = f"empty_numbers_{timestamp}.xlsx"
        save_to_excel(numbers, filename)
    else:
        raise ValueError(f"不支持的输出格式: {output_format}")
    
    return filename

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="生成空号（未被使用的手机号）")
    
    parser.add_argument("--count", type=int, default=1, help="生成号码的数量 (1-10000)")
    parser.add_argument("--operator", type=str, default="all", 
                       choices=["all", "mobile", "unicom", "telecom"], 
                       help="运营商类型")
    parser.add_argument("--prefix", type=str, help="号码前缀")
    parser.add_argument("--output", type=str, default="text",
                       choices=OUTPUT_FORMATS,
                       help="输出格式")
    
    args = parser.parse_args()
    
    try:
        generator = PhoneNumberGenerator()
        start_time = time.time()
        
        numbers = generator.generate_batch(
            count=args.count,
            operator=args.operator,
            prefix=args.prefix
        )
        
        filename = save_result(numbers, args.output)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"生成成功，{len(numbers)}个{args.operator}空号已保存至{filename}")
        print(f"耗时: {duration:.2f}秒")
        
    except Exception as e:
        print(f"错误: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 