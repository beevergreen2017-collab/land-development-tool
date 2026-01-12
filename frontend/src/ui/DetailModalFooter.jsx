import React from 'react';

const DetailModalFooter = ({
    onCancel,
    onApply,
    onSave,
    isPass = true,
    calculatedRate = 0,
    cap = null,
    isOverCap = false,
    unit = '%'
}) => {
    return (
        <div className="mt-4 pt-4 border-t bg-white sticky bottom-0">
            <div className={`p-3 rounded flex justify-between items-center mb-4 ${isPass ? 'bg-blue-50' : 'bg-red-50'}`}>
                <div>
                    <div className="font-bold text-sm">預估獎勵 (Est.)</div>
                    <div className={`text-xs ${isPass ? 'text-green-600' : 'text-red-500'}`}>
                        {isPass ? '符合條件 (Compliant)' : '缺必要條件 (Missing Criteria)'}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-blue-700">
                        {calculatedRate.toFixed(2)}{unit}
                    </div>
                    {isOverCap && cap !== null && (
                        <div className="text-red-600 text-xs font-bold mt-1">
                            ⚠ Capped at {cap}{unit}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onApply}
                    disabled={!isPass}
                    className={`px-4 py-2 border rounded font-medium transition-colors ${!isPass
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                        }`}
                >
                    Apply (帶入)
                </button>
                <button
                    onClick={onSave}
                    disabled={!isPass}
                    className={`px-4 py-2 rounded text-white shadow-sm font-medium transition-colors ${!isPass
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    Apply & Save (帶入並存檔)
                </button>
            </div>
        </div>
    );
};

export default DetailModalFooter;
