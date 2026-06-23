// State Management
let releaseNotes = [];
let activeFilter = 'all';
let searchKeyword = '';
let selectedUpdate = null;

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterPills = document.getElementById('filterPills');
const feedContainer = document.getElementById('feedContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const feedTimeline = document.getElementById('feedTimeline');
const statusText = document.getElementById('statusText');
const statusBadge = document.getElementById('statusBadge');
const retryBtn = document.getElementById('retryBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const tweetTextarea = document.getElementById('tweetTextarea');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyTweetBtn = document.getElementById('copyTweetBtn');
const copyBtnText = document.getElementById('copyBtnText');
const submitTweetBtn = document.getElementById('submitTweetBtn');
const charCountSpan = document.getElementById('charCount');
const charProgressCircle = document.getElementById('charProgressCircle');
const toastContainer = document.getElementById('toastContainer');

// Progress Circle Config (Radius: 12, Circumference: 2 * PI * 12 ~ 75.4)
const CIRCUMFERENCE = 2 * Math.PI * 12;
if (charProgressCircle) {
    charProgressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    charProgressCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

/* --- API Operations --- */

// Fetch data from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading();
    
    // Animate sync icon
    const syncIcon = refreshBtn.querySelector('.icon-sync');
    if (syncIcon) syncIcon.classList.add('spinning');
    refreshBtn.disabled = true;

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            releaseNotes = data.releases;
            updateStatusText(data.source, data.last_fetched);
            renderFeed();
            if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }
        } else {
            throw new Error(data.error || 'Server reported failure');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
        showToast('Failed to fetch release notes.', 'error');
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Update the cache source/status badge
function updateStatusText(source, lastFetched) {
    let text = '';
    const pulse = statusBadge.querySelector('.pulse-indicator');
    
    // Format timestamp nicely
    const dateStr = lastFetched ? lastFetched.split(' ')[1] || lastFetched : '';
    
    if (source === 'network') {
        text = `Live (Refreshed ${dateStr})`;
        pulse.className = 'pulse-indicator green';
    } else if (source === 'cache') {
        text = `Cached (${dateStr})`;
        pulse.className = 'pulse-indicator green';
    } else {
        text = `Offline/Fallback`;
        pulse.className = 'pulse-indicator yellow';
    }
    
    statusText.textContent = text;
}

/* --- UI State Rendering --- */

function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    feedTimeline.classList.add('hidden');
}

function showError(msg) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
    emptyState.classList.add('hidden');
    feedTimeline.classList.add('hidden');
}

function renderFeed() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    
    // Filter & Search the releases
    const filteredReleases = filterAndSearchData();
    
    if (filteredReleases.length === 0) {
        emptyState.classList.remove('hidden');
        feedTimeline.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    feedTimeline.classList.remove('hidden');
    feedTimeline.innerHTML = '';
    
    filteredReleases.forEach(entry => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Date Header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        
        const dateNode = document.createElement('div');
        dateNode.className = 'date-node';
        
        const dateTitle = document.createElement('h3');
        dateTitle.className = 'date-title';
        dateTitle.textContent = entry.date;
        
        // Create link to specific date anchor on Google Cloud BigQuery Release Notes
        const sourceLink = document.createElement('a');
        sourceLink.className = 'date-source-link';
        sourceLink.href = entry.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.title = 'View official documentation';
        sourceLink.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        `;
        
        dateHeader.appendChild(dateNode);
        dateHeader.appendChild(dateTitle);
        dateHeader.appendChild(sourceLink);
        dateGroup.appendChild(dateHeader);
        
        // Updates List for this Date
        const dateUpdates = document.createElement('div');
        dateUpdates.className = 'date-updates';
        
        entry.updates.forEach((update, idx) => {
            const card = document.createElement('div');
            card.className = 'update-card';
            
            // Card Header (Type & Share Actions)
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const categoryClass = update.type.toLowerCase();
            const tag = document.createElement('span');
            tag.className = `category-tag ${categoryClass}`;
            tag.textContent = update.type;
            
            const cardActions = document.createElement('div');
            cardActions.className = 'card-actions';
            
            // Copy Card Content Button
            const copyCardBtn = document.createElement('button');
            copyCardBtn.className = 'btn-icon btn-copy-card-icon';
            copyCardBtn.title = 'Copy update details to clipboard';
            copyCardBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;
            
            copyCardBtn.addEventListener('click', async () => {
                const cleanText = stripHtml(update.html).replace(/\s+/g, ' ').trim();
                const contentToCopy = `BigQuery Update (${entry.date}) - ${update.type}:\n${cleanText}\n\nSource Link: ${entry.link || 'https://cloud.google.com/bigquery/docs/release-notes'}`;
                try {
                    await navigator.clipboard.writeText(contentToCopy);
                    showToast('Update copied to clipboard!', 'success');
                    
                    // Show checkmark icon as visual feedback
                    copyCardBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-feature);">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    setTimeout(() => {
                        copyCardBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        `;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy: ', err);
                    showToast('Failed to copy text.', 'error');
                }
            });
            
            // Tweet/Share Button
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'btn-icon btn-tweet-icon';
            tweetBtn.title = 'Tweet this update';
            tweetBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
            `;
            
            tweetBtn.addEventListener('click', () => {
                openTweetModal(entry.date, entry.link, update);
            });
            
            cardActions.appendChild(copyCardBtn);
            cardActions.appendChild(tweetBtn);
            cardHeader.appendChild(tag);
            cardHeader.appendChild(cardActions);
            card.appendChild(cardHeader);
            
            // Content Body
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = update.html;
            
            // Style links within content to open in new tab
            const links = cardContent.querySelectorAll('a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });
            
            card.appendChild(cardContent);
            dateUpdates.appendChild(card);
        });
        
        dateGroup.appendChild(dateUpdates);
        feedTimeline.appendChild(dateGroup);
    });
}

// Filter and Search releaseNotes state
function filterAndSearchData() {
    const keyword = searchKeyword.toLowerCase().trim();
    
    return releaseNotes.map(entry => {
        // Filter updates inside the entry
        const matchedUpdates = entry.updates.filter(update => {
            // Category tag filter
            if (activeFilter !== 'all' && update.type !== activeFilter) {
                return false;
            }
            
            // Keyword text search filter
            if (keyword) {
                const typeMatch = update.type.toLowerCase().includes(keyword);
                const textContent = stripHtml(update.html).toLowerCase();
                const contentMatch = textContent.includes(keyword);
                const dateMatch = entry.date.toLowerCase().includes(keyword);
                return typeMatch || contentMatch || dateMatch;
            }
            
            return true;
        });
        
        // Return copy of entry with filtered updates
        return {
            ...entry,
            updates: matchedUpdates
        };
    }).filter(entry => entry.updates.length > 0); // Keep dates with at least 1 matching update
}

/* --- Tweet Composer Modal Operations --- */

// Parse HTML tags to plain text
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.innerText || div.textContent || '';
}

// Open tweet composer modal
function openTweetModal(date, link, update) {
    selectedUpdate = { date, link, update };
    
    // Construct default tweet text
    // Example: BigQuery Update (June 15, 2026) - Feature: Use Gemini Cloud Assist to optimize SQL queries...
    const header = `BigQuery Update (${date}) - ${update.type}: `;
    const cleanText = stripHtml(update.html).replace(/\s+/g, ' ').trim();
    const hashtags = `\n\n#BigQuery #GoogleCloud`;
    const targetLink = link || 'https://cloud.google.com/bigquery/docs/release-notes';
    
    // Character math:
    // URLs count as 23 characters on X.
    const urlPlaceholder = ' '.repeat(23);
    const textLimit = 280 - header.length - hashtags.length - urlPlaceholder.length - 4; // 4 for '...' space
    
    let excerpt = cleanText;
    if (excerpt.length > textLimit) {
        excerpt = excerpt.substring(0, textLimit).trim() + '...';
    }
    
    const tweetText = `${header}${excerpt}${hashtags}\n${targetLink}`;
    
    tweetTextarea.value = tweetText;
    updateCharCount();
    
    tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Stop scrolling behind modal
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    document.body.style.overflow = '';
    selectedUpdate = null;
    
    // Reset copy button status
    copyBtnText.textContent = 'Copy';
    copyTweetBtn.classList.remove('success');
}

// Recalculate character limits and display progress ring
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // X/Twitter URL counting logic:
    // All URLs are shortened to t.co which occupies exactly 23 characters.
    // Let's find URL tokens and count them as 23 characters.
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    // Strip URLs from text length, then add 23 for each URL found
    let baseText = text;
    urls.forEach(url => {
        baseText = baseText.replace(url, '');
    });
    
    const tweetLength = baseText.length + (urls.length * 23);
    const charsRemaining = 280 - tweetLength;
    
    charCountSpan.textContent = charsRemaining;
    
    // Color state
    if (charsRemaining < 0) {
        charCountSpan.className = 'char-count error';
        submitTweetBtn.disabled = true;
        charProgressCircle.style.stroke = '#ef4444'; // Red
    } else if (charsRemaining <= 20) {
        charCountSpan.className = 'char-count warning';
        submitTweetBtn.disabled = false;
        charProgressCircle.style.stroke = '#f59e0b'; // Amber
    } else {
        charCountSpan.className = 'char-count';
        submitTweetBtn.disabled = false;
        charProgressCircle.style.stroke = '#6366f1'; // Violet/Blue
    }
    
    // Progress Ring offset calculation
    const progress = Math.max(0, Math.min(tweetLength / 280, 1));
    const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    charProgressCircle.style.strokeDashoffset = offset;
}

// Copy Tweet text to Clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        copyBtnText.textContent = 'Copied!';
        showToast('Tweet copied to clipboard!', 'success');
        setTimeout(() => {
            copyBtnText.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy text.', 'error');
    }
}

// Open X/Twitter Compose Dialog
function postToX() {
    const text = tweetTextarea.value;
    const urlEncodedText = encodeURIComponent(text);
    const xIntentUrl = `https://x.com/intent/tweet?text=${urlEncodedText}`;
    
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
    showToast('Redirected to X (Twitter)', 'info');
}

/* --- Toast Notification Helper --- */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon selection
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"></path></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083.985l-.53 1.625a.75.75 0 01-1.083-.984l.53-1.626zM12 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z"></path></svg>`;
    }
    
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Remove element after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3800);
}

// Export currently filtered releases list to CSV file
function exportToCSV() {
    const filteredData = filterAndSearchData();
    if (filteredData.length === 0) {
        showToast('No updates to export.', 'error');
        return;
    }
    
    let csvRows = [];
    // Headers
    csvRows.push(['Date', 'Category', 'Update Details', 'Original Link']);
    
    filteredData.forEach(entry => {
        entry.updates.forEach(update => {
            const cleanText = stripHtml(update.html).replace(/\s+/g, ' ').trim();
            csvRows.push([entry.date, update.type, cleanText, entry.link || 'https://cloud.google.com/bigquery/docs/release-notes']);
        });
    });
    
    const csvString = csvRows.map(row => 
        row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    
    try {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV export downloaded successfully!', 'success');
    } catch (err) {
        console.error('Failed to export CSV:', err);
        showToast('Failed to export CSV.', 'error');
    }
}

/* --- Event Listeners Setup --- */

// Search input keyword changes
searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    if (searchKeyword.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    renderFeed();
});

// Clear search keyword button click
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchKeyword = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderFeed();
});

// Pills category filtering
filterPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    
    // Set active class
    filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    
    activeFilter = pill.dataset.filter;
    renderFeed();
});

// Refresh button click
refreshBtn.addEventListener('click', () => {
    fetchReleaseNotes(true);
});

// Reset search and filters helper
function resetFilters() {
    searchInput.value = '';
    searchKeyword = '';
    clearSearchBtn.style.display = 'none';
    
    filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    filterPills.querySelector('[data-filter="all"]').classList.add('active');
    activeFilter = 'all';
    
    renderFeed();
}

resetFiltersBtn.addEventListener('click', resetFilters);
retryBtn.addEventListener('click', () => fetchReleaseNotes(true));

// Tweet modal events
closeModalBtn.addEventListener('click', closeTweetModal);
tweetModal.addEventListener('click', (e) => {
    if (e.target === tweetModal) closeTweetModal();
});
tweetTextarea.addEventListener('input', updateCharCount);
copyTweetBtn.addEventListener('click', copyTweetToClipboard);
submitTweetBtn.addEventListener('click', postToX);
exportCsvBtn.addEventListener('click', exportToCSV);

// ESC key closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
        closeTweetModal();
    }
});

// Initialize app on load
window.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
});
