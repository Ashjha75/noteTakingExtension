// Simple Markdown parser
class SimpleMarkdown {
    static parse(text) {
        if (!text) return '';
        
        // Replace headers
        text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        
        // Replace bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Replace italic
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Replace links
        text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Replace lists
        text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
        
        // Wrap lists in ul
        if (text.includes('<li>')) {
            text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        }
        
        // Replace code blocks
        text = text.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
        
        // Replace inline code
        text = text.replace(/`(.+?)`/g, '<code>$1</code>');
        
        // Replace paragraphs (must be done last)
        text = text.replace(/^(?!<[a-z]).+$/gm, '<p>$&</p>');
        
        return text;
    }
}
