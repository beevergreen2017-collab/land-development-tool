
{/* Basement Assessment */ }
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-6 border-b border-gray-100 bg-gray-50 h-16 flex items-center">
        <h3 className="text-lg font-bold text-gray-700 border-l-4 border-gray-500 pl-3">地下層評估 (Basement Assessment)</h3>
    </div>
    <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1. Excavation Rate (%) */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">開挖率 (%)</label>
                <input
                    type="number"
                    value={basementInputs?.excavation_rate ?? ''}
                    onChange={e => setBasementInput('excavation_rate', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 2. Floor Height (m) */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">層高 (m)</label>
                <input
                    type="number"
                    value={basementInputs?.floor_height ?? ''}
                    onChange={e => setBasementInput('floor_height', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 3. Car Park Area m2/unit */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">汽車車位面積 (m²/車)</label>
                <input
                    type="number"
                    value={basementInputs?.parking_space_area ?? ''}
                    onChange={e => setBasementInput('parking_space_area', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 4. Moto Park Area m2/unit */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">機車車位面積 (m²/車)</label>
                <input
                    type="number"
                    value={basementInputs?.motorcycle_unit_area ?? ''}
                    onChange={e => setBasementInput('motorcycle_unit_area', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>

            {/* 5. Legal Parking Count */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">法定汽車 (輛)</label>
                <input
                    type="number"
                    value={basementInputs?.legal_parking ?? ''}
                    onChange={e => setBasementInput('legal_parking', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 6. Bonus Parking Count */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">獎勵增設 (輛)</label>
                <input
                    type="number"
                    value={basementInputs?.bonus_parking ?? ''}
                    onChange={e => setBasementInput('bonus_parking', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 7. Legal Moto Count */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">法定機車 (輛)</label>
                <input
                    type="number"
                    value={basementInputs?.legal_motorcycle ?? ''}
                    onChange={e => setBasementInput('legal_motorcycle', parseFloat(e.target.value))}
                    onBlur={saveScenario}
                    className="w-full border p-2 rounded text-center"
                />
            </div>
            {/* 8. Total Car Eqv */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">總車位需求 (折合汽車)</label>
                <div className="w-full bg-gray-50 border p-2 rounded text-center text-gray-500">
                    {basementCalc.calcTotalParking?.toFixed(1) || 0}
                </div>
            </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">預估地下樓層</div>
                <div className="text-2xl font-bold text-gray-800">B{basementCalc.estBasementFloors || 0}</div>
            </div>
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">地下單層面積</div>
                <div className="text-xl font-bold text-gray-800">{(basementCalc.basementFloorArea || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            </div>
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">地下總樓地板</div>
                <div className="text-xl font-bold text-gray-800">{(basementCalc.basementTotalGFA || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            </div>
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">總開挖深度</div>
                <div className="text-xl font-bold text-gray-800">{(basementCalc.totalExcavationDepth || 0).toFixed(1)} m</div>
            </div>
        </div>
    </div>
</div>
