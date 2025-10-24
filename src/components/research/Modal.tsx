"use client";

import type { ReactNode } from "react";
import { ModalBase } from "@/components/modal/ModalBase";

type ModalProps = {
	open: boolean;
	onClose: () => void;
	titleId?: string;
	descId?: string;
	children: ReactNode;
};

export function Modal({ open, onClose, titleId = "modal-title", descId = "modal-desc", children }: ModalProps) {
	return (
		<ModalBase open={open} onClose={onClose} labelledBy={titleId} describedBy={descId}>
			{children}
		</ModalBase>
	);
}
