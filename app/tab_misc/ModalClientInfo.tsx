// ClientEditModal.tsx
import React from 'react';
import {
    Button,
    Input,
    Modal,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Textarea
} from "@heroui/react";
import type {ClientType} from "@/app/types";

interface ClientEditModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingClient: ClientType | null;
    setEditingClient: (client: ClientType | null) => void;
    isNew: boolean;
    onSave: () => void;
    onCancel: () => void;
}

export function ClientModal({
                                isOpen,
                                onOpenChange,
                                editingClient,
                                setEditingClient,
                                isNew,
                                onSave,
                                onCancel
                            }: ClientEditModalProps) {
    if (!editingClient) return null;

    // Генерируем времена с 7:00 до 21:00 с шагом 30 минут
    const times: string[] = [];
    for (let h = 7; h <= 21; h++) {
        for (const m of [0, 30]) {
            const hh = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");
            times.push(`${hh}:${mm}`);
        }
    }

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent className="sm:max-w-[520px] px-[10px]">
                <ModalHeader className="!px-[10px]">
                    {isNew ? "Добавить клиента" : "Редактировать клиента"}
                </ModalHeader>
                <form
                    className="space-y-3 mt-2"
                    onSubmit={e => {
                        e.preventDefault();
                        onSave();
                    }}
                >
                    <Input
                        label="Имя"
                        size="sm"
                        value={editingClient.name ?? ""}
                        onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                        required
                    />

                    <div className="flex flex-col gap-2">
                        <div className="flex flex-row gap-3">
                            <Select
                                size="sm"
                                label="День недели"
                                placeholder="Выберите день"
                                selectedKeys={editingClient.meeting_day ? new Set([String(editingClient.meeting_day)]) : new Set()}
                                onSelectionChange={keys => {
                                    const val = Array.from(keys)[0];
                                    setEditingClient({
                                        ...editingClient,
                                        meeting_day: val ? Number(val) : undefined
                                    });
                                }}
                            >
                                <SelectItem key="1">Понедельник</SelectItem>
                                <SelectItem key="2">Вторник</SelectItem>
                                <SelectItem key="3">Среда</SelectItem>
                                <SelectItem key="4">Четверг</SelectItem>
                                <SelectItem key="5">Пятница</SelectItem>
                            </Select>

                            <Select
                                size="sm"
                                label="Время встречи"
                                placeholder="Выберите время"
                                selectedKeys={editingClient.meeting_time ? new Set([editingClient.meeting_time]) : new Set()}
                                onSelectionChange={keys => {
                                    const val = Array.from(keys)[0];
                                    setEditingClient({
                                        ...editingClient,
                                        meeting_time: val ? String(val) : undefined
                                    });
                                }}
                            >
                                {times.map((t) => (
                                    <SelectItem key={t}>{t.replace(/^0/, "")}</SelectItem>
                                ))}
                            </Select>

                            <Input
                                size="sm"
                                label="Встреч до..."
                                type="number"
                                value={editingClient.past_meetings === 0 ? "" : String(editingClient.past_meetings)}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    past_meetings: e.target.value === "" ? 0 : Number(e.target.value)
                                })}
                            />
                        </div>


                        <div className="flex flex-row gap-3">
                        <label className="flex gap-2 items-center ml-2">
                            <input
                                type="checkbox"
                                checked={editingClient.every_two_weeks}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    every_two_weeks: e.target.checked,
                                })}
                            />
                            Раз в 2 недели
                        </label>

                        <label className="flex gap-2 items-center ml-2">
                            <input
                                type="checkbox"
                                checked={editingClient.duration_50min || false}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    duration_50min: e.target.checked,
                                })}
                            />
                            50 минут
                        </label>
                        </div>

                    </div>

                    <Select
                        size="sm"
                        label="Тип встречи"
                        placeholder="Выберите тип"
                        selectedKeys={editingClient.meeting_type ? new Set([editingClient.meeting_type]) : new Set()}
                        onSelectionChange={keys => {
                            const val = Array.from(keys)[0];
                            setEditingClient({
                                ...editingClient,
                                meeting_type: val ? String(val) as 'client' | 'supervision' | 'group' : null
                            });
                        }}
                    >
                        <SelectItem key="client">Клиент</SelectItem>
                        <SelectItem key="supervision">Супервизия</SelectItem>
                        <SelectItem key="group">Группа</SelectItem>
                    </Select>

                    <div className="flex flex-col gap-2 mb-2">
                        <div className="flex flex-row gap-3">

                            <Input
                                size="sm"
                                label="Цена"
                                type="number"
                                value={editingClient.price === 0 ? "" : String(editingClient.price)}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    price: e.target.value === "" ? 0 : Number(e.target.value)
                                })}
                            />

                            <Select
                                size="sm"
                                label="Валюта"
                                className="w-[200px]"
                                selectedKeys={new Set([editingClient.currency || "euro"])}
                                onSelectionChange={keys => {
                                    const val = Array.from(keys)[0];
                                    setEditingClient({...editingClient, currency: String(val)});
                                }}
                            >
                                <SelectItem key="usd">USD</SelectItem>
                                <SelectItem key="euro">EUR</SelectItem>
                            </Select>

                            <Select
                                size="sm"
                                label="Метод оплаты"
                                className="w-[350px]"
                                placeholder="Выберите метод"
                                selectedKeys={editingClient.payment_method ? new Set([editingClient.payment_method]) : new Set()}
                                onSelectionChange={keys => {
                                    const val = Array.from(keys)[0];
                                    setEditingClient({
                                        ...editingClient,
                                        payment_method: val ? String(val) as 'pesos' | 'usd' | 'rubles' | 'paypal' | 'usdt' : null
                                    });
                                }}
                            >
                                <SelectItem key="usd">USD</SelectItem>
                                <SelectItem key="pesos">Pesos</SelectItem>
                                <SelectItem key="rubles">Рубли</SelectItem>
                                <SelectItem key="paypal">PayPal</SelectItem>
                                <SelectItem key="usdt">USDT</SelectItem>
                            </Select>
                        </div>

                        <label className="flex gap-2 items-center pl-2">
                            <input
                                type="checkbox"
                                checked={editingClient.pay_per_session || false}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    pay_per_session: e.target.checked,
                                })}
                            />
                            Оплата сразу
                        </label>

                    </div>

                    <Input
                        size="sm"
                        label="Часовой пояс"
                        value={editingClient.timezone || ""}
                        onChange={e => setEditingClient({...editingClient, timezone: e.target.value})}
                    />

                    <Input
                        size="sm"
                        label="Fixed Name"
                        value={editingClient.fixed_name || ""}
                        onChange={e => setEditingClient({...editingClient, fixed_name: e.target.value})}
                    />

                    <Input
                        size="sm"
                        label="URL"
                        value={editingClient.url ?? ""}
                        onChange={e => setEditingClient({...editingClient, url: e.target.value})}
                    />



                        {/*<label className="flex gap-2 items-center">*/}
                        {/*    <input*/}
                        {/*        type="checkbox"*/}
                        {/*        checked={editingClient.exclude_from_calculations || false}*/}
                        {/*        onChange={e => setEditingClient({*/}
                        {/*            ...editingClient,*/}
                        {/*            exclude_from_calculations: e.target.checked,*/}
                        {/*        })}*/}
                        {/*    />*/}
                        {/*    Исключить из подсчетов*/}
                        {/*</label>*/}


                    <Textarea
                        size="sm"
                        label="Заметки"
                        value={editingClient.notes ?? ""}
                        onChange={e => setEditingClient({...editingClient, notes: e.target.value})}
                    />

                    <ModalFooter className="mt-3">

                        <label className="flex gap-2 items-center mr-[50px] text-orange-500">
                            <input
                                type="checkbox"
                                checked={editingClient.is_hidden || false}
                                onChange={e => setEditingClient({
                                    ...editingClient,
                                    is_hidden: e.target.checked,
                                })}
                            />
                            Скрыть
                        </label>

                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Отмена
                        </Button>

                        <Button type="submit" color="primary">
                            Сохранить
                        </Button>

                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}