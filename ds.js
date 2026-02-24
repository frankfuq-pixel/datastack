document.addEventListener('DOMContentLoaded', () => {
	const editor = document.getElementById('editor');
	const btn = document.getElementById('actionButton');

	const settings = [
		{ id: 'textareaWidth', apply: v => editor.style.width = v + 'px', span: 'textareaWidthVal' },
		{ id: 'textareaHeight', apply: v => editor.style.height = v + 'px', span: 'textareaHeightVal' },
		{ id: 'fontSize', apply: v => editor.style.fontSize = v + 'px', span: 'fontSizeVal' },
		{ id: 'bgHue', apply: v => document.body.style.backgroundColor = `hsl(${v},70%,80%)`, span: 'bgHueVal' },
		{ id: 'buttonWidth', apply: v => btn.style.width = v + 'px', span: 'buttonWidthVal' }
	];

	settings.forEach(s => {
		const el = document.getElementById(s.id);
		const span = document.getElementById(s.span);
		if (!el || !span) return;

		// apply saved value or default
		const saved = localStorage.getItem(s.id);
		if (saved !== null) el.value = saved;
		s.apply(el.value);
		span.textContent = el.value;

		// update on input
		el.addEventListener('input', (e) => {
			const v = e.target.value;
			s.apply(v);
			span.textContent = v;
			localStorage.setItem(s.id, v);
		});
	});

	// sample button action: insert timestamp into editor
	btn.addEventListener('click', () => {
		const now = new Date().toLocaleString();
		editor.value += `\n[Action clicked: ${now}]`;
	});
});
