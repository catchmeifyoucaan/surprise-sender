import React, { useEffect, useMemo, useState } from 'react';

export type SmtpItem = {
	id: string;
	host?: string;
	port?: number;
	username?: string;
	label?: string;
	isValid?: boolean;
};

export type SmtpSelectorValue = {
	mode: 'single' | 'multiple' | 'all';
	selectedIds: string[];
};

export const SMTPSelector: React.FC<{
	items: SmtpItem[];
	value?: SmtpSelectorValue;
	onChange: (val: SmtpSelectorValue) => void;
	className?: string;
	disabled?: boolean;
	label?: string;
}> = ({ items, value, onChange, className, disabled, label }) => {
	const validItems = useMemo(() => items.filter(i => i.isValid !== false), [items]);
	const [mode, setMode] = useState<'single'|'multiple'|'all'>(value?.mode || 'single');
	const [singleId, setSingleId] = useState<string>(value?.selectedIds?.[0] || validItems[0]?.id || '');
	const [multiIds, setMultiIds] = useState<string[]>(value?.selectedIds || []);

	useEffect(() => {
		if (mode === 'all') onChange({ mode, selectedIds: validItems.map(i => i.id) });
		else if (mode === 'single') onChange({ mode, selectedIds: singleId ? [singleId] : [] });
		else onChange({ mode, selectedIds: multiIds });
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, singleId, multiIds, validItems.length]);

	return (
		<div className={className}>
			{label && (<label className="block text-sm font-medium text-text-primary mb-1">{label}</label>)}
			<div className="flex items-center gap-3 mb-2">
				<label className="flex items-center gap-1 text-sm text-text-secondary">
					<input type="radio" name="smtp-mode" checked={mode==='single'} onChange={()=>setMode('single')} disabled={disabled} /> Single
				</label>
				<label className="flex items-center gap-1 text-sm text-text-secondary">
					<input type="radio" name="smtp-mode" checked={mode==='multiple'} onChange={()=>setMode('multiple')} disabled={disabled} /> Multiple
				</label>
				<label className="flex items-center gap-1 text-sm text-text-secondary">
					<input type="radio" name="smtp-mode" checked={mode==='all'} onChange={()=>setMode('all')} disabled={disabled} /> Use All
				</label>
			</div>
			{mode === 'single' && (
				<select
					className="w-full bg-slate-800/50 rounded border border-slate-700 px-3 py-2 text-sm"
					value={singleId}
					onChange={(e) => setSingleId(e.target.value)}
					disabled={disabled || validItems.length===0}
				>
					{validItems.length === 0 ? (
						<option value="">No SMTPs</option>
					) : validItems.map(it => (
						<option key={it.id} value={it.id}>{it.label || `${it.host}:${it.port} (${it.username})`}</option>
					))}
				</select>
			)}
			{mode === 'multiple' && (
				<div className="max-h-40 overflow-y-auto space-y-1 border border-slate-700 rounded p-2 bg-slate-800/30">
					{validItems.length === 0 ? (
						<div className="text-sm text-text-secondary">No SMTPs</div>
					) : validItems.map(it => (
						<div key={it.id} className="flex items-center gap-2">
							<input type="checkbox" checked={multiIds.includes(it.id)} onChange={() => setMultiIds(prev => prev.includes(it.id) ? prev.filter(id => id !== it.id) : [...prev, it.id])} />
							<span className="text-sm text-text-secondary">{it.label || `${it.host}:${it.port} (${it.username})`}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};