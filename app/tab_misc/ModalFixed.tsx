import React from 'react';
import {Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button} from "@heroui/react";
import type {ClientType} from "@/app/types";
import {useMainContext} from "@/app/context";

interface FixedModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number | null;
    priceUsd: number;
    allMeetings: number;
    sum: number;
    fixedAmount: number;
}

export const FixedModal = ({isOpen, onOpenChange, clientId, priceUsd, allMeetings, sum, fixedAmount}: FixedModalProps) => {
    const {clients} = useMainContext();

    const client = clients.find(c => c.id === clientId);

    if (!client) return null;

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement={"top"}>
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    Информация о клиенте
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-3">
                        <p><strong>Клиент:</strong> {client.name}</p>
                        {client.fixed_name && <p><strong>Fixed Name:</strong> {client.fixed_name}</p>}
                        {/*<p><strong>Цена за встречу:</strong> {client.price} {client.currency === 'euro' ? '€' : '$'}</p>*/}
                        <p><strong>Количество встреч:</strong> {allMeetings}</p>
                        <p><strong>Цена USD за встречу:</strong> {priceUsd} $</p>
                        <p><strong>Итоговая сумма:</strong> {sum} $</p>
                        {/*<p><strong>Fixed сумма:</strong> {fixedAmount} $</p>*/}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onPress={() => onOpenChange(false)}>
                        Закрыть
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};