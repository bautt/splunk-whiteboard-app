(() => {
  const svg = document.getElementById('architecture-canvas');
  const workspace = document.getElementById('architecture-workspace');
  const viewport = document.getElementById('architecture-viewport');
  const zoomLevel = document.getElementById('zoom-level');
  const detailLayer = document.getElementById('detail-layer');
  const detailTitle = document.getElementById('detail-title');
  const detailDescription = document.getElementById('detail-description');
  const detailLink = document.getElementById('detail-link');
  const detailPanel = document.getElementById('detail-panel');

  const details = {
    edge: { layer: 'Customer data sources', title: 'Edge, Branch, and OT', description: 'Capture signals close to the source, from branch infrastructure and operational technology through Edge Processor and Universal Forwarder.' },
    datacenter: { layer: 'Customer data sources', title: 'Private Data Center', description: 'Bring application, virtualization, database, Kubernetes, network, and mainframe signals into the fabric.' },
    cloud: { layer: 'Customer data sources', title: 'Public Cloud', description: 'Connect cloud services, containers, serverless workloads, and cloud logs while keeping each source in context.' },
    saas: { layer: 'Customer data sources', title: 'SaaS and Security', description: 'Connect security, identity, email, CI/CD, and ticketing signals through APIs and reusable connectors.' },
    lakehouse: { layer: 'Customer data sources', title: 'Lakehouse and Archive', description: 'Use open file and lakehouse connections to bring archived and analytical data into governed investigations.' },
    management: { layer: 'Data Management', title: 'Data Management', description: 'Collect, filter, mask, transform, and route data before it reaches the catalog and downstream search layers.' },
    ai: { layer: 'AI and collaboration', title: 'AI and Collaboration Layer', description: 'Give people and agents governed fabric context for exploration, reasoning, collaboration, and reviewed action.' },
    as: { layer: 'Data Management', title: 'Auto-Schematization', description: 'Use representative events to recommend mappings and generate reviewable field-extraction logic.', href: 'https://cisco-full-stack-observability.navattic.com/ASAFE' },
    go: { layer: 'Data Management', title: 'Guided Onboarding', description: 'Plan an onboarding strategy from intent and context, with a focused task list for bringing new data into the fabric.', href: 'https://cisco-full-stack-observability.navattic.com/AIDMGOB' },
    shp: { layer: 'Data Management', title: 'Self-Healing Pipelines', description: 'Detect schema drift and CIM compliance issues, then propose reviewable, non-destructive corrections.', href: 'https://cisco-full-stack-observability.navattic.com/SHP' },
    ep: { layer: 'Data Management', title: 'Edge Processor (EP)', description: 'Filter, mask, transform, and route data close to where it is generated before it enters the platform.', href: 'aidmasafe.html?demo=ep' },
    ip: { layer: 'Data Management', title: 'Ingest Processor (IP)', description: 'Apply scalable ingest-time processing and data shaping as signals enter the platform.', href: 'aidmasafe.html?demo=ip' },
    catalog: { layer: 'Discovery and governance', title: 'Catalog', description: 'Create a single, RBAC-aware inventory of datasets, fields, lineage, retention, ownership, and lifecycle.', href: 'sources1.html' },
    mdl: { layer: 'Data layer', title: 'Machine Data Lake', description: 'Store data in Splunk-managed MDL Raw Storage, then promote it to Splunk Index or customer-defined MDL Analytics Tables.', href: 'https://cisco-full-stack-observability.navattic.com/6o6m0nkd' },
    platform: { layer: 'Center of the data fabric', title: 'Machine Data Analytics', description: 'At the center of the data fabric, turn promoted data into search, dashboards, alerts, and repeated high-performance investigations.', href: 'https://cisco-full-stack-observability.navattic.com/splunkppdemo' },
    federated: { layer: 'Data layer', title: 'Federated Search', description: 'Query supported external data where it lives through SPL2, without unnecessary movement or duplication.', href: 'https://cisco-full-stack-observability.navattic.com/t69j0lzb' },
    edl: { layer: 'Federated Search destinations', title: 'External Data Lakes', description: 'Connect to supported external data lakes, including Amazon S3, Azure Data Lake, Snowflake, and Databricks, while keeping data at rest.', href: 'aidm.html#federated' },
    assistant: { layer: 'AI and collaboration', title: 'Splunk AI Assistant', description: 'Use governed context discovery, natural-language assistance, and reviewed actions across the fabric.', href: 'https://cisco-full-stack-observability.navattic.com/saiaconf26' },
    mcp: { layer: 'AI and collaboration', title: 'Splunk MCP Server', description: 'Connect external agents to approved Splunk capabilities while preserving existing access controls and auditability.', href: 'https://cisco-full-stack-observability.navattic.com/p4s0fhj' },
    launchpad: { layer: 'AI and collaboration', title: 'Agent Launchpad', description: 'Build governed agents with objectives, prompts, guardrails, permissions, and enterprise connectors.', href: 'https://cisco-full-stack-observability.navattic.com/ujs0pag' },
    canvas: { layer: 'AI and collaboration', title: 'AI Canvas in Cisco Cloud Control', description: 'Collaborate across domains with live reasoning, contextual widgets, and reviewed operational actions.', href: 'ai4.html' },
    'cloud-control': { layer: 'Cisco Cloud Control', title: 'Cisco Cloud Control', description: 'Coordinate AI-assisted operations across domains with Splunk context, shared workflows, and governed action.', href: 'ai4.html' },
    'outcome-alerts': { layer: 'Business outcome', title: 'Alerts raised', description: 'Turn governed signals into timely operational alerts that help teams detect and respond to what matters.' },
    'outcome-dashboards': { layer: 'Business outcome', title: 'Dashboards', description: 'Give teams reusable dashboards built from trusted, contextualized data across the fabric.' },
    'outcome-agents': { layer: 'Business outcome', title: 'AI agents act', description: 'Enable agents to reason over governed context and take reviewed actions with the right guardrails.' },
    'outcome-tco': { layer: 'Business outcome', title: 'Lower TCO', description: 'Reduce unnecessary data movement, duplication, and indexing while preserving useful access to data.' },
    'outcome-workloads': { layer: 'Business outcome', title: 'BI / AI workloads', description: 'Support analytics and AI workloads with trusted data that remains discoverable, usable, and governed.' },
    'outcome-reuse': { layer: 'Business outcome', title: 'Governed reuse', description: 'Reuse curated data products, context, and controls across teams without losing ownership or oversight.' }
  };

  const state = { scale: 0.8, x: 380, y: 113.6, dragging: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 };
  const minScale = 0.5;
  const maxScale = 2.6;
  const overviewScale = 0.8;
  const overviewFocus = { x: 800, y: 663 };

  const render = () => {
    viewport.setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.scale})`);
    zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
  };

  const svgPoint = (event) => {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };

  const setZoom = (nextScale, anchor) => {
    const point = anchor || { x: 800, y: 560 };
    const beforeX = (point.x - state.x) / state.scale;
    const beforeY = (point.y - state.y) / state.scale;
    state.scale = Math.min(maxScale, Math.max(minScale, nextScale));
    state.x = point.x - beforeX * state.scale;
    state.y = point.y - beforeY * state.scale;
    render();
  };

  const resetView = () => {
    state.scale = overviewScale;
    state.x = svg.viewBox.baseVal.width / 2 - overviewFocus.x * overviewScale;
    state.y = svg.viewBox.baseVal.height / 2 - overviewFocus.y * overviewScale;
    render();
  };

  const selectNode = (key) => {
    const info = details[key];
    if (!info) return;
    detailPanel.classList.remove('is-hidden');
    document.querySelectorAll('.diagram-node.selected').forEach((node) => node.classList.remove('selected'));
    const selected = document.querySelector(`[data-key="${key}"]`);
    if (selected) selected.classList.add('selected');
    detailLayer.textContent = info.layer;
    detailTitle.textContent = info.title;
    detailDescription.textContent = info.description;
    detailLink.hidden = !info.href;
    if (info.href) {
      detailLink.href = info.href;
      detailLink.textContent = `Open ${info.title} demo`;
    }
  };

  document.getElementById('zoom-in').addEventListener('click', () => setZoom(state.scale * 1.22));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(state.scale / 1.22));
  document.getElementById('zoom-reset').addEventListener('click', resetView);

  workspace.addEventListener('wheel', (event) => {
    event.preventDefault();
    setZoom(state.scale * Math.pow(1.0018, -event.deltaY), svgPoint(event));
  }, { passive: false });

  workspace.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.diagram-node')) return;
    state.dragging = true;
    state.moved = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.originX = state.x;
    state.originY = state.y;
    workspace.classList.add('is-dragging');
    workspace.setPointerCapture(event.pointerId);
  });

  workspace.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    const scaleX = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
    const scaleY = svg.viewBox.baseVal.height / svg.getBoundingClientRect().height;
    const dx = (event.clientX - state.startX) * scaleX;
    const dy = (event.clientY - state.startY) * scaleY;
    state.moved = Math.abs(dx) > 3 || Math.abs(dy) > 3;
    state.x = state.originX + dx;
    state.y = state.originY + dy;
    render();
  });

  const stopDragging = (event) => {
    if (!state.dragging) return;
    state.dragging = false;
    workspace.classList.remove('is-dragging');
    if (workspace.hasPointerCapture(event.pointerId)) workspace.releasePointerCapture(event.pointerId);
    setTimeout(() => { state.moved = false; }, 0);
  };
  workspace.addEventListener('pointerup', stopDragging);
  workspace.addEventListener('pointercancel', stopDragging);

  document.querySelectorAll('.diagram-node').forEach((node) => {
    node.addEventListener('click', () => {
      if (!state.moved) selectNode(node.dataset.key);
    });
    node.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectNode(node.dataset.key);
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.diagram-node') || event.target.closest('#detail-panel')) return;
    detailPanel.classList.add('is-hidden');
    document.querySelectorAll('.diagram-node.selected').forEach((node) => node.classList.remove('selected'));
  });

  detailPanel.classList.add('is-hidden');
  render();
})();
