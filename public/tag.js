document.addEventListener('DOMContentLoaded', () => {
  const tagSelect = document.getElementById('tagSelect');
  const customTagLabel = document.getElementById('customTagLabel');
  const customTagInput = document.getElementById('customTagInput');

  tagSelect.addEventListener('change', () => {
    customTagLabel.style.display = tagSelect.value === 'custom' ? 'block' : 'none';
  });

  document.getElementById('tagForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    let url = document.getElementById('url').value.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    let tag = tagSelect.value === 'custom'
      ? customTagInput.value.trim()
      : tagSelect.value;

    if (!title || !url || (tagSelect.value === 'custom' && !tag)) {
      alert('Please fill out all fields.');
      return;
    }

    if (tagSelect.value === 'custom') {
      const wordCount = tag.split(/\s+/).filter(Boolean).length;
      if (wordCount > 3) {
        alert('Custom tags can be at most 3 words.');
        return;
      }
    }

    chrome.bookmarks.create({ title, url }, (newBookmark) => {
      if (!newBookmark || !newBookmark.id) {
        alert('Failed to create bookmark.');
        return;
      }

      chrome.storage.local.set({ ['tag-' + newBookmark.id]: tag }, () => {
        chrome.runtime.sendMessage(
          { type: 'bookmark-added', bookmarkId: newBookmark.id },
          () => {
            chrome.windows.getCurrent((win) => {
              chrome.windows.remove(win.id);
            });
          }
        );
      });
    });
  });
});
