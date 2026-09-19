(() => {
  'use strict';

  const BUILD = '20260919-warden-shell-preview-1';
  const config = window.HubWardenRoutes;

  function createShell(root, options = {}) {
    if (!root) throw new Error('Warden shell root is unavailable.');
    if (!config || !Array.isArray(config.groups)) throw new Error('Warden route configuration is unavailable.');

    const workspaceMap = new Map();
    const groupMap = new Map();
    config.groups.forEach(group => {
      groupMap.set(group.id, group);
      group.workspaces.forEach(workspace => workspaceMap.set(workspace.id, { ...workspace, groupId: group.id }));
    });

    let activeWorkspaceId = String(options.initialWorkspace || 'dashboard');
    if (!workspaceMap.has(activeWorkspaceId)) activeWorkspaceId = 'dashboard';

    const header = document.createElement('header');
    header.className = 'warden-shell';
    header.innerHTML = `
      <div class="warden-shell-top">
        <div>
          <div class="warden-shell-title">THE HUB // WARDEN CONSOLE</div>
          <div class="warden-shell-subtitle">PRIVATE CAMPAIGN ADMINISTRATION</div>
        </div>
        <div class="warden-shell-mode">STRUCTURAL PREVIEW</div>
      </div>
      <nav class="warden-primary-nav" aria-label="Warden console sections"></nav>
      <div class="warden-nav-divider" aria-hidden="true"></div>
      <nav class="warden-secondary-nav" aria-label="Warden console workspaces"></nav>
      <div class="warden-shell-status"><span data-warden-active></span><span>THE HUB</span></div>
    `;
    root.replaceChildren(header);

    const primary = header.querySelector('.warden-primary-nav');
    const secondary = header.querySelector('.warden-secondary-nav');
    const activeLabel = header.querySelector('[data-warden-active]');

    function activeWorkspace() {
      return workspaceMap.get(activeWorkspaceId);
    }

    function activeGroup() {
      return groupMap.get(activeWorkspace()?.groupId);
    }

    function makeButton(label, className, active, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className + (active ? ' active' : '');
      button.textContent = label;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.addEventListener('click', onClick);
      return button;
    }

    function emitChange() {
      const workspace = activeWorkspace();
      const group = activeGroup();
      window.dispatchEvent(new CustomEvent('hub-warden-workspace-change', {
        detail: { build: BUILD, workspace, group }
      }));
    }

    function render() {
      const workspace = activeWorkspace();
      const group = activeGroup();
      primary.replaceChildren();
      secondary.replaceChildren();

      config.groups.forEach(item => {
        primary.appendChild(makeButton(item.label, 'warden-primary-btn', item.id === group.id, () => {
          setWorkspace(item.defaultWorkspace);
        }));
      });

      if (group.workspaces.length > 1) {
        group.workspaces.forEach(item => {
          secondary.appendChild(makeButton(item.label, 'warden-secondary-btn', item.id === workspace.id, () => {
            setWorkspace(item.id);
          }));
        });
      }
      secondary.classList.toggle('empty', group.workspaces.length <= 1);
      activeLabel.textContent = workspace.label + ' // CURRENT';
    }

    function setWorkspace(workspaceId, emit = true) {
      const next = String(workspaceId || '').trim();
      if (!workspaceMap.has(next) || next === activeWorkspaceId) return false;
      activeWorkspaceId = next;
      render();
      if (emit) emitChange();
      return true;
    }

    render();
    queueMicrotask(emitChange);

    return Object.freeze({
      build: BUILD,
      get workspace() { return activeWorkspace(); },
      get group() { return activeGroup(); },
      setWorkspace
    });
  }

  window.HubWardenShell = Object.freeze({ build: BUILD, createShell });
})();
