import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ForwarderUniversal from '@splunk/react-icons/ForwarderUniversal';
import ForwarderHeavy from '@splunk/react-icons/ForwarderHeavy';
import CylinderIndex from '@splunk/react-icons/CylinderIndex';
import Indexes from '@splunk/react-icons/Indexes';
import MonitorUser from '@splunk/react-icons/MonitorUser';
import Servers from '@splunk/react-icons/Servers';
import ServerLicense from '@splunk/react-icons/ServerLicense';
import StorageMonitor from '@splunk/react-icons/StorageMonitor';
import NetworkDevice from '@splunk/react-icons/NetworkDevice';
import Processor from '@splunk/react-icons/Processor';
import ServersCloud from '@splunk/react-icons/ServersCloud';
import CloudArrowInRight from '@splunk/react-icons/CloudArrowInRight';
import Bucket from '@splunk/react-icons/Bucket';
import NetworkConnector from '@splunk/react-icons/NetworkConnector';
import NetworkDevices from '@splunk/react-icons/NetworkDevices';
import CellularGateway from '@splunk/react-icons/CellularGateway';
import DeviceEdgeHub from '@splunk/react-icons/DeviceEdgeHub';
import DataType from '@splunk/react-icons/DataType';
import Shield from '@splunk/react-icons/Shield';
import Cloud from '@splunk/react-icons/Cloud';
import DriveIndexes from '@splunk/react-icons/DriveIndexes';

/** Map Splunk shape stencil id → react-icon component (SVG icon mode). */
export const SHAPE_ICONS = {
    uf: ForwarderUniversal,
    hf: ForwarderHeavy,
    indexer: CylinderIndex,
    indexerCluster: Indexes,
    sh: MonitorUser,
    shc: Servers,
    ds: NetworkDevice,
    lm: ServerLicense,
    mc: StorageMonitor,
    cm: NetworkConnector,
    ep: Processor,
    ip: Processor,
    splunkCloud: ServersCloud,
    hec: CloudArrowInRight,
    s3: Bucket,
    server: NetworkDevices,
    db: DriveIndexes,
    syslog: DataType,
    cloudSvc: Cloud,
    firewall: Shield,
    router: CellularGateway,
    internet: DeviceEdgeHub,
};

const svgCache = Object.create(null);

/** Static SVG markup for a shape icon (used when rehydrating template/board files). */
export function getShapeSvgMarkup(shapeId) {
    if (svgCache[shapeId]) return svgCache[shapeId];
    const IconComp = SHAPE_ICONS[shapeId];
    if (!IconComp) return null;
    try {
        const markup = ReactDOMServer.renderToStaticMarkup(
            React.createElement(IconComp, { size: 3 })
        );
        if (markup.startsWith('<svg')) {
            svgCache[shapeId] = markup;
            return markup;
        }
    } catch {
        // skip icons that fail to render
    }
    return null;
}
