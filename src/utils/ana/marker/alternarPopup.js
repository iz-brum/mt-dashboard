// popupToggle.js
export function attachPopupToggleEvents(popupEl) {
    popupEl.querySelectorAll('.popup-header').forEach(header => {
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
    });
    popupEl.querySelectorAll('.popup-header').forEach(header => {
      header.addEventListener('click', () => {
        const contentEl = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');
        contentEl.classList.toggle('collapsed');
        icon.classList.toggle('rotated');
      });
    });
  }
  