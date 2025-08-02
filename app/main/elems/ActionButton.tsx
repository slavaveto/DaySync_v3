import React, {useState} from "react";

import {Button, ButtonGroup, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Selection} from "@heroui/react";
import clsx from "clsx";

const ChevronDownIcon = () => {
    return (
        <svg fill="none" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M17.9188 8.17969H11.6888H6.07877C5.11877 8.17969 4.63877 9.33969 5.31877 10.0197L10.4988 15.1997C11.3288 16.0297 12.6788 16.0297 13.5088 15.1997L15.4788 13.2297L18.6888 10.0197C19.3588 9.33969 18.8788 8.17969 17.9188 8.17969Z"
                fill="currentColor"
            />
        </svg>
    );
};

interface ActionButtonProps {
    item: any;
    onDone: () => void;
    onDelete: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({item, onDone, onDelete}) => {

    const [selectedOption, setSelectedOption] = useState<Selection>(new Set(["done"]));

    const labelsMap = {
        done: "✓ Done",
        delete: "✕ Delete",
    };

    const colorsMap = {
        done: "success" as const,
        delete: "danger" as const,
    };

    const selectedOptionValue = Array.from(selectedOption)[0] as "done" | "delete";

    const handleAction = () => {
        if (selectedOptionValue === "done") {
            onDone();
        } else if (selectedOptionValue === "delete") {
            onDelete();
        }
    };

    return (
        <ButtonGroup
            variant="flat"
            size="sm"
        >
            <Button
                onClick={handleAction}
                className={clsx("font-semibold")}
                color={colorsMap[selectedOptionValue]}
            >
                {labelsMap[selectedOptionValue]}
            </Button>
            <Dropdown placement="bottom-end">
                <DropdownTrigger>
                    <Button isIconOnly
                            size="sm"
                            color={colorsMap[selectedOptionValue]}
                    >
                        <ChevronDownIcon/>
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    disallowEmptySelection
                    aria-label="Action options"
                    selectedKeys={selectedOption}
                    selectionMode="single"
                    onSelectionChange={setSelectedOption}
                >
                    <DropdownItem key="done" color="success">
                        ✓ Done
                    </DropdownItem>
                    <DropdownItem key="delete" color="danger">
                        ✕ Delete
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </ButtonGroup>
    );
};

export default ActionButton;