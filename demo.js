verifyBtn.onclick = () => {
    const entered = input.value.trim();

    if (entered === s.id) {

        // ===== 2 MONTH CHECK =====
        if (s.lastIssued) {
            const lastDate = new Date(s.lastIssued);
            const now = new Date();

            const monthDiff =
                (now.getFullYear() - lastDate.getFullYear()) * 12 +
                (now.getMonth() - lastDate.getMonth());

            if (monthDiff < 2) {
                verifyBtn.textContent = 'Wait 2 months';
                setTimeout(() => verifyBtn.textContent = 'Verify & Reissue', 1200);
                return;
            }
        }

        // ===== REISSUE =====
        s.needsReissue = false;
        s.issuedCount = (s.issuedCount || 0) + 1;
        s.lastIssued = new Date().toLocaleString();

        save(list);
        renderAll();

        verifyBtn.textContent = 'Reissued ✓';
        setTimeout(() => verifyBtn.textContent = 'Verify & Reissue', 900);

    } else {
        verifyBtn.textContent = 'ID mismatch';
        setTimeout(() => verifyBtn.textContent = 'Verify & Reissue', 900);
    }
};
