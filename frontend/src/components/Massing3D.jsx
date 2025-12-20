import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

function Building({ width, height, footprint_area, floors }) {
    if (!width || !height) return null;

    const gfa = footprint_area * floors;

    return (
        <group position={[0, height / 2, 0]}>
            {/* Glass-like Building Mass */}
            <mesh>
                <boxGeometry args={[width, height, width]} />
                <meshStandardMaterial
                    color="#60a5fa"
                    transparent
                    opacity={0.5}
                    roughness={0.1}
                    metalness={0.1}
                />
            </mesh>
            {/* Wireframe for definition */}
            <mesh>
                <boxGeometry args={[width, height, width]} />
                <meshBasicMaterial wireframe color="#2563eb" opacity={0.3} transparent />
            </mesh>
            <Html position={[width / 2, height / 2, width / 2]} className="pointer-events-none select-none">
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-blue-100 text-xs min-w-[140px]">
                    <h5 className="font-bold text-blue-800 mb-1 border-b border-blue-200 pb-1">地上建物</h5>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-gray-600">
                        <span>高度:</span> <span className="text-right font-mono">{Math.round(height * 10) / 10}m ({floors}F)</span>
                        <span>單層:</span> <span className="text-right font-mono">{Math.round(footprint_area).toLocaleString()} m²</span>
                        <span>總積:</span> <span className="text-right font-mono font-bold text-blue-600">{Math.round(gfa).toLocaleString()} m²</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

function Basement({ width, depth, area, floors }) {
    if (!width || !depth) return null;

    return (
        <group position={[0, -depth / 2, 0]}>
            {/* Semi-transparent Basement */}
            <mesh>
                <boxGeometry args={[width, depth, width]} />
                <meshStandardMaterial color="#ef4444" transparent opacity={0.3} roughness={0.5} />
            </mesh>
            <mesh>
                <boxGeometry args={[width, depth, width]} />
                <meshBasicMaterial wireframe color="#b91c1c" opacity={0.3} transparent />
            </mesh>
            <Html position={[width / 2, -depth / 2, width / 2]} className="pointer-events-none select-none">
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-red-100 text-xs min-w-[120px]">
                    <h5 className="font-bold text-red-800 mb-1 border-b border-red-200 pb-1">地下室</h5>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-gray-600">
                        <span>深度:</span> <span className="text-right font-mono">{Math.round(depth * 10) / 10}m (B{floors})</span>
                        <span>面積:</span> <span className="text-right font-mono">{Math.round(area).toLocaleString()} m²</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

const Massing3D = ({
    floors = 15,
    floor_height = 3.3,
    footprint_area = 500,
    basement_floors = 3,
    basement_area = 500,
    basement_floor_height = 3.3
}) => {

    const buildingWidth = useMemo(() => Math.sqrt(footprint_area), [footprint_area]);
    const buildingHeight = floors * floor_height;

    const basementWidth = useMemo(() => Math.sqrt(basement_area), [basement_area]);
    const basementDepth = basement_floors * basement_floor_height;

    // Camera settings: Position it to see the whole building
    // Increase multiplier slightly to accommodate larger labels
    const camDist = Math.max(buildingHeight, basementDepth, buildingWidth) * 3.0;

    return (
        <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-gray-50 to-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group">

            {/* Overlay Info - Simplified now that 3D labels are detailed */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur shadow-md p-3 rounded-lg border border-gray-100 text-sm opacity-80 group-hover:opacity-100 transition-opacity">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> 3D 量體預覽
                </h4>
            </div>

            <Canvas camera={{ position: [camDist, camDist / 2, camDist], fov: 45 }}>
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.8} enableDamping dampingFactor={0.05} />

                <ambientLight intensity={0.6} />
                <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
                <directionalLight position={[-10, 10, -10]} intensity={0.4} color="#b0c4de" />

                {/* Improved Ground */}
                <gridHelper args={[500, 50, 0xcbd5e1, 0xe2e8f0]} position={[0, -0.01, 0]} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                    <planeGeometry args={[1000, 1000]} />
                    <meshStandardMaterial color="#f8fafc" roughness={1} />
                </mesh>

                <Building
                    width={buildingWidth}
                    height={buildingHeight}
                    footprint_area={footprint_area}
                    floors={floors}
                />
                <Basement
                    width={basementWidth}
                    depth={basementDepth}
                    area={basement_area}
                    floors={basement_floors}
                />

                {/* Axes Helper: X=Red, Y=Green, Z=Blue */}
                <axesHelper args={[5]} />
            </Canvas>
        </div>
    );
};

export default Massing3D;
