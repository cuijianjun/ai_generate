#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空号生成工具 - Web应用
提供基于Flask的Web界面
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file
import tempfile
import pandas as pd

# 导入空号生成器
from phone_generator import PhoneGenerator, VERIFY_MODES

# 创建Flask应用
app = Flask(__name__, template_folder='templates', static_folder='static')

# 保存生成记录的字典
generation_history = []

# 默认API密钥配置（实际应用中应从环境变量或配置文件加载）
DEFAULT_API_KEY = os.environ.get('PHONE_API_KEY', '')


@app.route('/')
def index():
    """首页"""
    # 传递验证模式定义到模板
    return render_template('index.html', verify_modes=VERIFY_MODES)


@app.route('/api/generate', methods=['POST'])
def generate_numbers():
    """生成空号的API接口"""
    try:
        # 获取请求参数
        data = request.get_json()
        count = int(data.get('count', 10))
        operator = data.get('operator', 'all')
        region = data.get('region')
        prefix = data.get('prefix')
        pattern = data.get('pattern', {})
        output_format = data.get('output_format', 'json')
        verify_mode = data.get('verify_mode', 'basic')
        api_key = data.get('api_key', DEFAULT_API_KEY)
        
        # 验证参数
        if count <= 0 or count > 10000:
            return jsonify({'error': '数量必须在1-10000之间'}), 400
            
        if operator not in ['all', 'mobile', 'unicom', 'telecom']:
            return jsonify({'error': '无效的运营商类型'}), 400
        
        if verify_mode not in VERIFY_MODES:
            return jsonify({'error': '无效的验证模式'}), 400
            
        if verify_mode == 'advanced' and not api_key:
            return jsonify({'error': '高级验证模式需要API密钥'}), 400
        
        # 创建配置
        config = {
            'operator': operator,
            'prefix': prefix,
            'pattern': pattern,
            'verify_mode': verify_mode, 
            'api_key': api_key
        }
        
        # 创建生成器并生成号码
        generator = PhoneGenerator(config)
        numbers = generator.generate_batch(count)
        
        # 记录本次生成
        history_entry = {
            'id': len(generation_history) + 1,
            'timestamp': datetime.now().isoformat(),
            'config': {
                'operator': operator,
                'prefix': prefix,
                'pattern': pattern,
                'verify_mode': verify_mode
            },
            'count': len(numbers)
        }
        generation_history.append(history_entry)
        
        # 返回结果
        return jsonify({
            'numbers': numbers,
            'metadata': {
                'count': len(numbers),
                'timestamp': datetime.now().isoformat(),
                'config': config,
                'verify_mode': verify_mode,
                'verify_mode_name': VERIFY_MODES.get(verify_mode, verify_mode)
            },
            'history_id': history_entry['id']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export', methods=['POST'])
def export_numbers():
    """导出号码到文件"""
    try:
        data = request.get_json()
        numbers = data.get('numbers', [])
        format_type = data.get('format', 'csv')
        
        if not numbers:
            return jsonify({'error': '没有可导出的号码'}), 400
        
        # 创建临时文件
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format_type == 'csv':
            # 创建DataFrame
            df = pd.DataFrame(numbers)
            # 添加百分比格式的概率
            if 'probability' in numbers[0]:
                df['空号概率'] = df['probability'].apply(lambda x: f"{x:.2%}")
                df = df.drop(columns=['probability'])
            
            # 生成文件路径
            file_path = os.path.join(temp_dir, f'phone_numbers_{timestamp}.csv')
            
            # 导出到CSV
            df.to_csv(file_path, index=False, encoding='utf-8-sig')
            
            # 返回文件
            return send_file(
                file_path,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'phone_numbers_{timestamp}.csv'
            )
            
        elif format_type == 'json':
            # 生成文件路径
            file_path = os.path.join(temp_dir, f'phone_numbers_{timestamp}.json')
            
            # 导出到JSON
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'numbers': numbers,
                    'metadata': {
                        'count': len(numbers),
                        'timestamp': datetime.now().isoformat()
                    }
                }, f, ensure_ascii=False, indent=2)
            
            # 返回文件
            return send_file(
                file_path,
                mimetype='application/json',
                as_attachment=True,
                download_name=f'phone_numbers_{timestamp}.json'
            )
            
        elif format_type == 'excel':
            # 创建DataFrame
            df = pd.DataFrame(numbers)
            # 添加百分比格式的概率
            if 'probability' in numbers[0]:
                df['空号概率'] = df['probability'].apply(lambda x: f"{x:.2%}")
                df = df.drop(columns=['probability'])
            
            # 生成文件路径
            file_path = os.path.join(temp_dir, f'phone_numbers_{timestamp}.xlsx')
            
            # 导出到Excel
            df.to_excel(file_path, index=False)
            
            # 返回文件
            return send_file(
                file_path,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'phone_numbers_{timestamp}.xlsx'
            )
        
        else:
            return jsonify({'error': '不支持的导出格式'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """获取生成历史记录"""
    enhanced_history = []
    for entry in generation_history:
        # 增强历史记录，添加验证模式名称
        enhanced_entry = entry.copy()
        verify_mode = entry.get('config', {}).get('verify_mode', 'basic')
        enhanced_entry['verify_mode_name'] = VERIFY_MODES.get(verify_mode, verify_mode)
        enhanced_history.append(enhanced_entry)
    
    return jsonify({
        'history': enhanced_history
    })


@app.route('/api/verify_modes', methods=['GET'])
def get_verify_modes():
    """获取可用的验证模式"""
    return jsonify({
        'verify_modes': VERIFY_MODES
    })


if __name__ == '__main__':
    # 确保目录结构存在
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    # 启动应用
    app.run(debug=True, host='0.0.0.0', port=5000) 