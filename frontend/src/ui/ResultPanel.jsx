import React from 'react';
import useProjectStore from '../store/useProjectStore';
import Massing3D from '../components/Massing3D';
import Comparator from './Comparator';

const AuditTag = ({ field, showAudit, audit }) => {
    if (!showAudit || !audit || !audit[field]) return null;
    const info = audit[field];
    return (
        <div className="mt-1 text-xs text-blue-600 bg-blue-50 p-1 rounded border border-blue-100">
            <div className="font-semibold">Ref: {info.source}</div>
            <div className="text-gray-500">{info.rule}</div>
        </div>
    );
};

const ResultPanel = () => {
    const { computedResult, baselineResult, basementInputs, captureBaseline, clearBaseline } = useProjectStore();
    const [showAudit, setShowAudit] = React.useState(false);
    const [showCompare, setShowCompare] = React.useState(false);

    if (!computedResult) return null;

    const { massing, basement, audit } = computedResult;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50 h-16 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-700 border-l-4 border-green-500 pl-3">結果預覽 (Results)</h3>
                    {baselineResult && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-medium">
                            Comparing
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Baseline Controls */}
                    {baselineResult ? (
                        <>
                            <button
                                onClick={() => setShowCompare(!showCompare)}
                                className={`text-xs px-3 py-1 rounded-full border transition-colors ${showCompare ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-gray-300 text-gray-500'}`}
                            >
                                {showCompare ? 'Show Metrics' : 'Show Comparison'}
                            </button>
                            <button
                                onClick={clearBaseline}
                                className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                            >
                                Clear Baseline
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={captureBaseline}
                            className="text-xs px-3 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                            Capture Baseline
                        </button>
                    )}

                    <div className="w-px h-4 bg-gray-300 mx-1"></div>

                    <button
                        onClick={() => setShowAudit(!showAudit)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${showAudit ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                    >
                        {showAudit ? 'Hide Sources' : 'Show Sources'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
                {/* 3D Preview */}
                <div className="p-6 h-[500px]">
                    <Massing3D
                        floors={massing.estFloors}
                        floor_height={3.3}
                        footprint_area={massing.estSingleFloorArea}
                        basement_floors={basement.estBasementFloors}
                        basement_area={basement.basementFloorArea}
                        basement_floor_height={basementInputs.floor_height}
                    />
                </div>

                {/* Summary Metrics OR Comparator */}
                <div className="p-6 space-y-6 overflow-y-auto h-[500px]">
                    {showCompare && baselineResult ? (
                        <Comparator baseline={baselineResult} current={computedResult} />
                    ) : (
                        <>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b">量體指標 (Massing Metrics)</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500">預估樓層數</div>
                                        <div className="font-mono font-bold text-lg text-purple-700">{massing.estFloors} F</div>
                                        <AuditTag field="estFloors" showAudit={showAudit} audit={audit} />
                                    </div>

                                    <div>
                                        <div className="text-gray-500">單層面積</div>
                                        <div className="font-mono">{massing.estSingleFloorArea.toLocaleString()} m²</div>
                                        <AuditTag field="estSingleFloorArea" showAudit={showAudit} audit={audit} />
                                    </div>

                                    <div>
                                        <div className="text-gray-500">總樓地板面積 (GFA)</div>
                                        <div className="font-mono text-blue-700 font-bold">{massing.massingGFA_Total.toLocaleString()} m²</div>
                                        <AuditTag field="massingGFA_Total" showAudit={showAudit} audit={audit} />
                                    </div>

                                    <div>
                                        <div className="text-gray-500">銷坪比</div>
                                        <div className="font-mono">{massing.saleableRatio.toFixed(2)}</div>
                                        <AuditTag field="saleableRatio" showAudit={showAudit} audit={audit} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b">地下室指標 (Basement Metrics)</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500">開挖樓層</div>
                                        <div className="font-mono font-bold text-lg text-red-700">B{basement.estBasementFloors}</div>
                                        <AuditTag field="estBasementFloors" showAudit={showAudit} audit={audit} />
                                    </div>

                                    <div>
                                        <div className="text-gray-500">開挖深度</div>
                                        <div className="font-mono">{basement.totalExcavationDepth.toFixed(1)} m</div>
                                        <AuditTag field="totalExcavationDepth" showAudit={showAudit} audit={audit} />
                                    </div>

                                    <div>
                                        <div className="text-gray-500">總停車位</div>
                                        <div className="font-mono">{basement.calcTotalParking} 輛</div>
                                        <AuditTag field="calcTotalParking" showAudit={showAudit} audit={audit} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultPanel;
