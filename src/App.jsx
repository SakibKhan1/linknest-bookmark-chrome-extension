import React, { useEffect, useState } from 'react';

function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ title: '', url: '', tag: '' });
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    fetchBookmarks();

    const handleChange = () => {
      fetchBookmarks();
    };

    chrome.bookmarks.onRemoved.addListener(handleChange);
    chrome.bookmarks.onChanged.addListener(handleChange);
    chrome.bookmarks.onMoved.addListener(handleChange);

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'bookmark-added' && msg.bookmarkId) {
        setHighlightId(msg.bookmarkId);
        fetchBookmarks(() => {
          setTimeout(() => {
            const element = document.getElementById(`bookmark-${msg.bookmarkId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        });
      }
    });

    return () => {
      chrome.bookmarks.onRemoved.removeListener(handleChange);
      chrome.bookmarks.onChanged.removeListener(handleChange);
      chrome.bookmarks.onMoved.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    if (highlightId) {
      const timeout = setTimeout(() => setHighlightId(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [highlightId]);

  const fetchBookmarks = (callback) => {
    chrome.bookmarks.getTree((tree) => {
      const flat = flattenBookmarks(tree).sort((a, b) =>
        a.title.localeCompare(b.title)
      );

      chrome.storage.local.get(null, (storedTags) => {
        const withTags = flat.map((bm) => ({
          ...bm,
          tag: storedTags['tag-' + bm.id] || null,
        }));
        setBookmarks(withTags);
        if (callback) callback();
      });
    });
  };

  const flattenBookmarks = (nodes) => {
    let items = [];
    for (let node of nodes) {
      if (node.url) {
        items.push({ id: node.id, title: node.title, url: node.url });
      }
      if (node.children) {
        items = items.concat(flattenBookmarks(node.children));
      }
    }
    return items;
  };

  const getTagColor = (tag) => {
    const colorMap = {
      reading: '#f39c12',
      videos: '#9b59b6',
      work: '#2980b9',
      school: '#27ae60',
      personal: '#e74c3c',
    };
    return colorMap[tag.toLowerCase()] || '#7f8c8d';
  };

  const filtered = bookmarks.filter((b) => {
    const query = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(query) ||
      (b.tag && b.tag.toLowerCase().includes(query))
    );
  });

const startEdit = (b) => {
  if (editingId === b.id) {
    setEditingId(null);
  } else {
    setEditingId(b.id);
    setEditData({ title: b.title, url: b.url, tag: b.tag || '' });


    setTimeout(() => {
      const element = document.getElementById(`bookmark-${b.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100); 
  }
};

const saveEdit = (id) => {
  const wordCount = editData.tag.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 3) {
    alert('Custom tags can be at most 3 words.');
    return;
  }

  chrome.bookmarks.update(id, {
    title: editData.title,
    url: editData.url,
  }, () => {
    chrome.storage.local.set({ ['tag-' + id]: editData.tag }, () => {
      setHighlightId(id); 
      fetchBookmarks(() => {
        setTimeout(() => {
          const element = document.getElementById(`bookmark-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100); 
      });
      setEditingId(null);
    });
  });
};
  return (
    <div
      style={{
        width: '550px',
        height: '500px',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '1rem',
        backgroundColor: '#121212',
        color: 'white',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <img
          src="icon128.png"
          alt="App Icon"
          style={{ width: '28px', height: '28px', marginRight: '8px' }}
        />
        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
          LinkNest - Bookmark Manager
        </h1>
      </div>

      <button
        onClick={() => {
          chrome.windows.create({
            url: chrome.runtime.getURL('tag.html'),
            type: 'popup',
            width: 400,
            height: 400,
            focused: true,
          });
        }}
        style={{
          backgroundColor: 'dodgerblue',
          color: 'white',
          padding: '0.5rem',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '1rem',
          cursor: 'pointer',
          width: '95%',
        }}
      >
        ➕ Create Bookmark
      </button>

      <div style={{ position: 'relative', width: '90%', maxWidth: '350px', margin: '0 auto 1rem' }}>
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem 2rem 0.5rem 0.5rem',
            width: '88%',
            borderRadius: '6px',
            border: '1px solid #555',
            backgroundColor: '#1e1e1e',
            color: 'white',
          }}
        />
        <span
          onClick={() => setSearch('')}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem',
            userSelect: 'none',
          }}
        >
          ×
        </span>
      </div>

      <ul style={{ paddingLeft: '0' }}>
        {filtered.map((b) => (
          <li
            key={b.id}
            id={`bookmark-${b.id}`}
            style={{
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              backgroundColor: highlightId === b.id ? 'rgba(255,165,0,0.2)' : 'transparent',
              border: highlightId === b.id ? '2px solid yellow' : 'none',
              borderRadius: '8px',
              transition: 'background-color 0.5s, border 0.5s',
            }}
          >
            <button
              onClick={() => startEdit(b)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                marginRight: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Edit bookmark"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="orange"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>

            {editingId === b.id ? (
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Title"
                  style={{
                    width: '90%',
                    marginBottom: '0.25rem',
                    padding: '4px',
                    fontSize: '0.85rem',
                  }}
                />
                <input
                  type="text"
                  value={editData.url}
                  onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                  placeholder="URL"
                  style={{
                    width: '90%',
                    marginBottom: '0.25rem',
                    padding: '4px',
                    fontSize: '0.85rem',
                  }}
                />

                <select
                  value={['personal', 'reading', 'videos', 'work', 'school'].includes(editData.tag?.toLowerCase()) ? editData.tag.toLowerCase() : 'custom'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditData({ ...editData, tag: value === 'custom' ? '' : value });
                  }}
                  style={{
                    width: '90%',
                    marginBottom: '0.25rem',
                    padding: '4px',
                    fontSize: '0.85rem',
                    backgroundColor: '#1e1e1e',
                    color: 'white',
                    border: '1px solid #555',
                    borderRadius: '4px',
                  }}
                >
                  <option value="personal">Personal</option>
                  <option value="reading">Reading</option>
                  <option value="videos">Videos</option>
                  <option value="work">Work</option>
                  <option value="school">School</option>
                  <option value="custom">Custom...</option>
                </select>

                {!['personal', 'reading', 'videos', 'work', 'school'].includes(editData.tag?.toLowerCase()) && (
                  <input
                    type="text"
                    value={editData.tag}
                    onChange={(e) => setEditData({ ...editData, tag: e.target.value })}
                    placeholder="Custom tag (max: 3 words)"
                    style={{
                      width: '90%',
                      marginBottom: '0.25rem',
                      padding: '4px',
                      fontSize: '0.85rem',
                    }}
                  />
                )}

                <div
                  style={{
                    width: '50%',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    gap: '6px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => saveEdit(b.id)}
                    style={{
                      flex: '1',
                      padding: '2px 6px',
                      backgroundColor: 'orange',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{
                      flex: '1',
                      padding: '2px 6px',
                      backgroundColor: '#555',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      chrome.bookmarks.remove(b.id, () => fetchBookmarks());
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      marginLeft: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete bookmark"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="red"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'dodgerblue',
                    textDecoration: 'none',
                    marginRight: '0.5rem',
                  }}
                >
                  {b.title || b.url}
                </a>
                {b.tag && (
                  <span
                    style={{
                      backgroundColor: getTagColor(b.tag),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {b.tag}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
