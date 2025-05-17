// 工资计算器核心功能实现

// DOM元素获取
document.addEventListener('DOMContentLoaded', function () {
    // 获取按钮元素
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');

    // 绑定事件
    calculateBtn.addEventListener('click', calculateSalary);
    resetBtn.addEventListener('click', resetForm);
    exportBtn.addEventListener('click', exportSalarySheet);

    // 设置社保基数和公积金基数默认值
    const baseSalaryInput = document.getElementById('baseSalary');
    baseSalaryInput.addEventListener('input', function () {
        // 默认将社保基数和公积金基数设置为与基本工资相同
        const value = this.value || 0;
        document.getElementById('socialSecurityBase').value = value;
        document.getElementById('housingFundBase').value = value;
    });
});

// 工资计算核心函数
function calculateSalary() {
    try {
        // 获取输入值
        const baseSalary = getInputValue('baseSalary');
        const workDays = getInputValue('workDays');
        const performanceRating = getInputValue('performanceRating');
        const weekdayOvertime = getInputValue('weekdayOvertime');
        const weekendOvertime = getInputValue('weekendOvertime');
        const holidayOvertime = getInputValue('holidayOvertime');
        const socialSecurityBase = getInputValue('socialSecurityBase');
        const housingFundBase = getInputValue('housingFundBase');
        const socialSecurityRate = getInputValue('socialSecurityRate') / 100; // 转为小数
        const housingFundRate = getInputValue('housingFundRate') / 100; // 转为小数
        const mealAllowance = getInputValue('mealAllowance');
        const transportAllowance = getInputValue('transportAllowance');
        const otherAllowance = getInputValue('otherAllowance');

        // 检查必填项
        if (baseSalary <= 0) {
            alert('请输入有效的基本工资');
            return;
        }

        // 1. 实发基本工资计算
        const actualBaseSalary = baseSalary; // 假设全勤

        // 2. 绩效工资计算
        const performanceSalary = baseSalary * performanceRating;

        // 3. 加班费计算
        const hourlyRate = baseSalary / workDays / 8; // 小时工资
        const weekdayOvertimePay = hourlyRate * 1.5 * weekdayOvertime;
        const weekendOvertimePay = hourlyRate * 2 * weekendOvertime;
        const holidayOvertimePay = hourlyRate * 3 * holidayOvertime;
        const totalOvertimePay = weekdayOvertimePay + weekendOvertimePay + holidayOvertimePay;

        // 4. 津贴合计
        const totalAllowance = mealAllowance + transportAllowance + otherAllowance;

        // 5. 税前工资合计
        const beforeTaxSalary = actualBaseSalary + performanceSalary + totalOvertimePay + totalAllowance;

        // 6. 社保和公积金计算
        const socialSecurityDeduction = socialSecurityBase * socialSecurityRate;
        const housingFundDeduction = housingFundBase * housingFundRate;

        // 7. 应纳税所得额计算
        const taxableIncome = beforeTaxSalary - socialSecurityDeduction - housingFundDeduction - 5000; // 起征点5000元

        // 8. 个人所得税计算
        const tax = calculatePersonalIncomeTax(taxableIncome);

        // 9. 税后工资计算
        const afterTaxSalary = beforeTaxSalary - socialSecurityDeduction - housingFundDeduction - tax;

        // 显示结果
        displayResult('resultBaseSalary', actualBaseSalary);
        displayResult('resultPerformance', performanceSalary);
        displayResult('resultOvertime', totalOvertimePay);
        displayResult('resultAllowance', totalAllowance);
        displayResult('resultSocialSecurity', socialSecurityDeduction);
        displayResult('resultHousingFund', housingFundDeduction);
        displayResult('resultTaxableIncome', taxableIncome);
        displayResult('resultTax', tax);
        displayResult('resultBeforeTax', beforeTaxSalary);
        displayResult('resultAfterTax', afterTaxSalary);

        // 显示结果区域
        document.getElementById('resultSection').style.display = 'block';

    } catch (error) {
        console.error('计算过程中出现错误:', error);
        alert('计算过程中出现错误，请检查输入数据');
    }
}

// 个人所得税计算函数
function calculatePersonalIncomeTax(taxableIncome) {
    // 如果应纳税所得额小于0，则不需要缴税
    if (taxableIncome <= 0) {
        return 0;
    }

    // 个人所得税税率表（2021年最新）
    let tax = 0;
    if (taxableIncome <= 36000) {
        tax = taxableIncome * 0.03;
    } else if (taxableIncome <= 144000) {
        tax = taxableIncome * 0.1 - 2520;
    } else if (taxableIncome <= 300000) {
        tax = taxableIncome * 0.2 - 16920;
    } else if (taxableIncome <= 420000) {
        tax = taxableIncome * 0.25 - 31920;
    } else if (taxableIncome <= 660000) {
        tax = taxableIncome * 0.3 - 52920;
    } else if (taxableIncome <= 960000) {
        tax = taxableIncome * 0.35 - 85920;
    } else {
        tax = taxableIncome * 0.45 - 181920;
    }

    return tax;
}

// 获取输入值的辅助函数
function getInputValue(id) {
    const value = parseFloat(document.getElementById(id).value) || 0;
    return value;
}

// 显示结果的辅助函数
function displayResult(id, value) {
    document.getElementById(id).textContent = value.toFixed(2);
}

// 重置表单
function resetForm() {
    // 重置所有输入框
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => {
        if (input.id === 'workDays') {
            input.value = '21.75'; // 保持默认工作天数
        } else if (input.id === 'performanceRating') {
            input.value = '1.0'; // 保持默认绩效等级
        } else if (input.id === 'socialSecurityRate') {
            input.value = '10.5'; // 保持默认社保比例
        } else if (input.id === 'housingFundRate') {
            input.value = '12'; // 保持默认公积金比例
        } else if (input.id === 'weekdayOvertime' || input.id === 'weekendOvertime' ||
            input.id === 'holidayOvertime' || input.id === 'mealAllowance' ||
            input.id === 'transportAllowance' || input.id === 'otherAllowance') {
            input.value = '0'; // 这些项默认为0
        } else {
            input.value = ''; // 其他输入框清空
        }
    });

    // 重置绩效下拉框
    document.getElementById('performanceRating').value = '1.0';

    // 重置结果显示
    const resultElements = document.querySelectorAll('.result-value');
    resultElements.forEach(element => {
        element.textContent = '0.00';
    });
}

// 导出工资单
function exportSalarySheet() {
    const name = document.getElementById('name').value || '员工';
    const position = document.getElementById('position').value || '未知职位';

    // 获取当前日期作为工资单生成日期
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const formattedDate = `${year}年${month}月${day}日`;

    // 构建CSV内容
    let csvContent = `姓名,${name}\n`;
    csvContent += `职位,${position}\n`;
    csvContent += `生成日期,${formattedDate}\n\n`;
    csvContent += `项目,金额(元)\n`;

    // 添加各项金额
    csvContent += `基本工资,${document.getElementById('resultBaseSalary').textContent}\n`;
    csvContent += `绩效工资,${document.getElementById('resultPerformance').textContent}\n`;
    csvContent += `加班费,${document.getElementById('resultOvertime').textContent}\n`;
    csvContent += `补贴合计,${document.getElementById('resultAllowance').textContent}\n`;
    csvContent += `社保个人部分,-${document.getElementById('resultSocialSecurity').textContent}\n`;
    csvContent += `公积金个人部分,-${document.getElementById('resultHousingFund').textContent}\n`;
    csvContent += `应纳税所得额,${document.getElementById('resultTaxableIncome').textContent}\n`;
    csvContent += `个人所得税,-${document.getElementById('resultTax').textContent}\n`;
    csvContent += `税前工资,${document.getElementById('resultBeforeTax').textContent}\n`;
    csvContent += `税后工资,${document.getElementById('resultAfterTax').textContent}\n`;

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${name}-工资单-${year}年${month}月.csv`);
    link.style.display = 'none';

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 