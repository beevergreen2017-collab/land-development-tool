import React from 'react';
import { compareResults } from '../domain/comparator.js';

const Comparator = ({ baseline, current }) => {
    const comparison = compareResults(baseline, current);

    if (!comparison.valid) {
        return <div className="text-red-500 p-4">Comparison Invalid: {comparison.error}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                        <th className="px-4 py-2">Metric</th>
                        <th className="px-4 py-2 text-right">Baseline</th>
                        <th className="px-4 py-2 text-right">Current</th>
                        <th className="px-4 py-2 text-right">Delta</th>
                        <th className="px-4 py-2 text-right">%</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {comparison.deltas.map((row) => {
                        const isPositive = row.delta > 0;
                        const isNegative = row.delta < 0;
                        const colorClass = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-400';
                        const sign = isPositive ? '+' : '';

                        return (
                            <tr key={row.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2 font-medium text-gray-700">{row.label}</td>
                                <td className="px-4 py-2 text-right font-mono text-gray-500">
                                    {row.baseVal.toLocaleString()} <span className="text-xs">{row.unit}</span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-gray-900 font-bold">
                                    {row.targetVal.toLocaleString()} <span className="text-xs">{row.unit}</span>
                                </td>
                                <td className={`px-4 py-2 text-right font-mono font-medium ${colorClass}`}>
                                    {sign}{row.delta.toLocaleString()}
                                </td>
                                <td className={`px-4 py-2 text-right font-mono text-xs ${colorClass}`}>
                                    {sign}{row.deltaPercent.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="mt-2 text-xs text-center text-gray-400">
                Baseline Snapshot: {baseline.snapshot?.timestamp ? new Date(baseline.snapshot.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
        </div>
    );
};

export default Comparator;
