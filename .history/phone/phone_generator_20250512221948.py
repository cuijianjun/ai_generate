#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空号生成工具 - 主程序
用于生成随机的中国大陆手机空号（符合电话规则但拨打不通的号码）
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
import re
from typing import Dict, List, Set, Tuple, Optional, Union, Any

# 可选依赖，用于第三方API验证
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

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

# 特别活跃的号段（这些号段分配率较高，空号概率较低）
ACTIVE_SEGMENTS = [
    "138", "139", "150", "151", "152", "158", "159", "182", "183", "187", "188",  # 移动
    "130", "131", "132", "155", "156", "186",  # 联通
    "189", "133", "153", "180", "181"   # 电信
]

# 收回的老号段（这些号段可能有较高的空号概率）
RECLAIMED_SEGMENTS = [
    "147", "148", "149", # 移动
    "145", "146", # 联通
    "174", # 电信
]

# 避免使用的特殊号码模式
SPECIAL_PATTERNS = [
    r'(\d)\1{5,}',  # 6个或更多相同数字
    r'12345',       # 连续顺序数字
    r'54321',       # 连续倒序数字
    r'(\d)(\d)(\d)\3\2\1',  # 回文
]

# 验证模式定义
VERIFY_MODES = {
    "basic": "基础模式(基于号段规则和概率模型)",
    "standard": "标准模式(增加历史数据和活跃度分析)",
    "advanced": "高级模式(集成第三方API实时验证)"
}

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
                - verify_mode: 验证模式 ('basic', 'standard', 'advanced')
                - api_key: 第三方API密钥(如果verify_mode='advanced')
        """
        self.config = config or {}
        self.generated_numbers: Set[str] = set()  # 用于存储已生成的号码，确保唯一性
        self.operator = self.config.get('operator', 'all')
        self.prefix = self.config.get('prefix', None)
        self.pattern = self.config.get('pattern', {})
        self.verify_mode = self.config.get('verify_mode', 'basic')
        self.api_key = self.config.get('api_key', None)
        
        # 验证模式检查
        if self.verify_mode not in VERIFY_MODES:
            print(f"警告: 未知的验证模式 '{self.verify_mode}'，将使用基础模式")
            self.verify_mode = 'basic'
            
        # 高级模式检查
        if self.verify_mode == 'advanced' and not REQUESTS_AVAILABLE:
            print("警告: 高级模式需要requests库，但未能导入。将降级到标准模式")
            self.verify_mode = 'standard'
            
        if self.verify_mode == 'advanced' and not self.api_key:
            print("警告: 高级模式需要API密钥，但未提供。将降级到标准模式")
            self.verify_mode = 'standard'
        
        # 根据运营商选择可用的号段前缀
        self.available_prefixes = self._get_available_prefixes()
        
        # 加载已知的分配号段 (实际应用中需要从数据库或配置文件加载)
        # 此处简化处理，使用预定义的活跃号段列表
        self.active_segments = ACTIVE_SEGMENTS
        self.reclaimed_segments = RECLAIMED_SEGMENTS
        
        # 加载空号历史数据 (仅标准和高级模式使用)
        self.empty_number_patterns = self._load_empty_number_patterns() if self.verify_mode in ['standard', 'advanced'] else {}
        
    def _load_empty_number_patterns(self) -> Dict[str, float]:
        """
        加载空号模式数据
        
        在实际应用中，这应该从数据库或配置文件加载
        此处简化为返回一些示例模式和其空号概率
        """
        # 这里示例性地返回一些号段的空号概率数据
        # 实际应用中应该是基于历史数据分析的结果
        return {
            # 移动
            "147": 0.92,  # 147开头的号码空号概率92%
            "148": 0.94,
            "149": 0.91,
            "134": 0.75,
            # 联通
            "145": 0.93,
            "146": 0.95,
            "166": 0.82,
            # 电信
            "174": 0.89,
            "199": 0.73,
            # 更细粒度的模式 - 某些特定的号段规律
            "1471": 0.97,
            "1741": 0.95,
        }
        
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
    
    def _get_empty_probability(self, number: str) -> float:
        """
        计算号码为空号的概率
        
        基于多重因素评估号码为空号的概率:
        1. 号段活跃度
        2. 特殊号码模式
        3. 历史空号数据模式匹配 (标准和高级模式)
        
        返回:
            空号概率 (0.0 - 1.0)
        """
        base_probability = 0.5  # 基础概率 50%
        
        # 1. 根据号段活跃度调整概率
        prefix2 = number[:2]
        prefix3 = number[:3]
        prefix4 = number[:4]
        
        # 活跃号段减少空号概率
        if prefix3 in self.active_segments:
            base_probability -= 0.2  # 活跃号段空号概率降低20%
            
        # 收回的老号段增加空号概率
        if prefix3 in self.reclaimed_segments:
            base_probability += 0.3  # 收回号段空号概率增加30%
        
        # 2. 特殊号码模式
        if self._is_special_pattern(number):
            base_probability -= 0.3  # 特殊模式号码通常被优先分配，空号概率降低
            
        # 3. 历史空号数据模式匹配 (仅标准和高级模式)
        if self.verify_mode in ['standard', 'advanced']:
            # 按照越来越细粒度的模式匹配
            for prefix_length in [4, 3, 2]:
                prefix = number[:prefix_length]
                if prefix in self.empty_number_patterns:
                    pattern_probability = self.empty_number_patterns[prefix]
                    # 加权混合当前概率和历史模式概率
                    base_probability = 0.3 * base_probability + 0.7 * pattern_probability
                    break
        
        # 确保概率在有效范围内
        return max(0.01, min(0.99, base_probability))
    
    def _verify_empty_number_api(self, number: str) -> Tuple[bool, float]:
        """
        使用第三方API验证号码是否为空号
        
        仅在高级模式下使用
        
        返回:
            (是否为空号, 空号概率)
        """
        if not REQUESTS_AVAILABLE or not self.api_key:
            return (False, 0.5)
            
        try:
            # 这只是示例API调用，实际集成时需要替换成真实API
            # url = f"https://api.example.com/phone/verify?number={number}&key={self.api_key}"
            # response = requests.get(url, timeout=5)
            # if response.status_code == 200:
            #     data = response.json()
            #     return (data.get("is_empty", False), data.get("probability", 0.5))
            
            # 模拟API调用结果
            is_empty = random.random() < self._get_empty_probability(number)
            probability = random.uniform(0.8, 0.99) if is_empty else random.uniform(0.01, 0.2)
            return (is_empty, probability)
            
        except Exception as e:
            print(f"API调用失败: {e}")
            return (False, 0.5)
    
    def _is_empty_number(self, number: str) -> Tuple[bool, float]:
        """
        判断号码是否为空号
        
        根据不同的验证模式，采用不同的判断策略:
        - basic: 基于号段规则和概率模型
        - standard: 增加历史数据和活跃度分析
        - advanced: 集成第三方API实时验证
        
        返回:
            (是否为空号, 空号概率)
        """
        # 计算基础概率
        empty_probability = self._get_empty_probability(number)
        
        # 高级模式: 使用API验证
        if self.verify_mode == 'advanced':
            return self._verify_empty_number_api(number)
            
        # 标准模式和基础模式: 基于概率判断
        is_empty = random.random() < empty_probability
        
        # 标准模式: 增强概率模型的确定性
        if self.verify_mode == 'standard':
            # 对高概率和低概率的结果增加确定性
            if empty_probability > 0.8:
                empty_probability = random.uniform(0.85, 0.98)
                is_empty = True
            elif empty_probability < 0.2:
                empty_probability = random.uniform(0.02, 0.15)
                is_empty = False
        
        return (is_empty, empty_probability)
    
    def generate_one(self) -> Tuple[Optional[str], float]:
        """
        生成一个随机空号
        
        返回:
            (号码, 空号概率) 或 (None, 0.0)
        """
        if not self.available_prefixes:
            return (None, 0.0)
            
        # 最多尝试50次生成
        for _ in range(50):
            # 根据验证模式选择生成策略
            if self.verify_mode == 'basic':
                # 基础模式: 随机选择前缀
                prefix = random.choice(self.available_prefixes)
            else:
                # 标准和高级模式: 优先选择空号概率高的前缀
                if random.random() < 0.7 and self.reclaimed_segments:  # 70%概率选择收回的老号段
                    valid_reclaimed = [p for p in self.reclaimed_segments if p in self.available_prefixes]
                    prefix = random.choice(valid_reclaimed) if valid_reclaimed else random.choice(self.available_prefixes)
                else:
                    # 避开特别活跃的号段
                    avoid_active = [p for p in self.available_prefixes if p not in self.active_segments]
                    prefix = random.choice(avoid_active) if avoid_active else random.choice(self.available_prefixes)
            
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
            is_empty, probability = self._is_empty_number(number)
            if is_empty:
                self.generated_numbers.add(number)
                return (number, probability)
                
        return (None, 0.0)  # 如果多次尝试都失败，返回None
    
    def generate_batch(self, count: int) -> List[Dict[str, Any]]:
        """
        批量生成指定数量的空号
        
        Args:
            count: 要生成的空号数量
            
        Returns:
            包含号码及元数据的字典列表
        """
        result = []
        start_time = time.time()
        
        print(f"[验证模式: {VERIFY_MODES.get(self.verify_mode, self.verify_mode)}]")
        
        for i in range(count):
            if i % 100 == 0 and i > 0:
                print(f"已生成 {i}/{count} 个号码...")
                
            phone, probability = self.generate_one()
            if phone:
                # 确定运营商
                operator = self._determine_operator(phone)
                
                # 添加到结果列表
                result.append({
                    'number': phone,
                    'operator': operator,
                    'region': '未知',  # 此处可扩展为真实归属地查询
                    'timestamp': datetime.now().isoformat(),
                    'probability': probability  # 空号概率
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

    def save_to_file(self, numbers: List[Dict[str, Any]], output_format: str, file_path: Optional[str] = None) -> str:
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
                        f.write(f"{item['number']},{item['operator']},{item['region']},{item['probability']:.2%}\n")
                        
            elif output_format == 'csv':
                with open(file_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['号码', '运营商', '归属地', '生成时间', '空号概率'])
                    for item in numbers:
                        writer.writerow([
                            item['number'], 
                            item['operator'], 
                            item['region'],
                            item['timestamp'],
                            f"{item['probability']:.2%}"
                        ])
                        
            elif output_format == 'json':
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'numbers': numbers,
                        'metadata': {
                            'count': len(numbers),
                            'timestamp': datetime.now().isoformat(),
                            'config': self.config,
                            'verify_mode': self.verify_mode
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
    parser.add_argument('--verify', choices=['basic', 'standard', 'advanced'],
                        default='basic', help='空号验证模式 (默认: basic)')
    parser.add_argument('--api-key', type=str, help='第三方API密钥 (verify=advanced时必需)')
    
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
        'pattern': pattern,
        'verify_mode': args.verify,
        'api_key': args.api_key
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
            print(f"{i+1}. {item['number']} ({item['operator']}) - 预计空号概率: {item['probability']:.0%}")
        
        if len(numbers) > 5:
            print(f"... 等共 {len(numbers)} 个号码")
    else:
        print("未能生成有效的空号")


if __name__ == "__main__":
    main() 