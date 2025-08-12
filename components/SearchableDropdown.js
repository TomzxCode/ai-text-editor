class SearchableDropdown {
    constructor() {
        this.instances = new Map();
    }

    init(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with id '${elementId}' not found`);
            return null;
        }

        // Destroy existing instance if it exists
        this.destroy(elementId);

        const defaultOptions = {
            searchEnabled: true,
            searchPlaceholderValue: 'Type to search...',
            shouldSort: false,
            placeholder: true,
            placeholderValue: 'Choose an option',
            itemSelectText: '',
            classNames: {
                containerOuter: 'choices',
                containerInner: 'choices__inner choices__inner--searchable',
                input: 'choices__input',
                inputCloned: 'choices__input--cloned',
                list: 'choices__list',
                listItems: 'choices__list--multiple',
                listSingle: 'choices__list--single',
                listDropdown: 'choices__list--dropdown',
                item: 'choices__item',
                itemSelectable: 'choices__item--selectable',
                itemDisabled: 'choices__item--disabled',
                itemChoice: 'choices__item--choice',
                placeholder: 'choices__placeholder',
                group: 'choices__group',
                groupHeading: 'choices__heading',
                button: 'choices__button',
                activeState: 'is-active',
                focusState: 'is-focused',
                openState: 'is-open',
                disabledState: 'is-disabled',
                highlightedState: 'is-highlighted',
                selectedState: 'is-selected',
                flippedState: 'is-flipped',
                loadingState: 'is-loading',
                noResults: 'has-no-results',
                noChoices: 'has-no-choices'
            },
            ...options
        };

        try {
            const choicesInstance = new Choices(element, defaultOptions);
            this.instances.set(elementId, choicesInstance);
            return choicesInstance;
        } catch (error) {
            console.error(`Error initializing searchable dropdown for ${elementId}:`, error);
            return null;
        }
    }

    destroy(elementId) {
        const instance = this.instances.get(elementId);
        if (instance) {
            try {
                instance.destroy();
            } catch (error) {
                console.warn(`Error destroying instance for ${elementId}:`, error);
            }
            this.instances.delete(elementId);
        }
    }

    getInstance(elementId) {
        return this.instances.get(elementId);
    }

    setValue(elementId, value, silent = false) {
        const instance = this.instances.get(elementId);
        if (instance) {
            try {
                if (silent) {
                    instance.setChoiceByValue(value);
                } else {
                    instance.setChoiceByValue(value);
                }
            } catch (error) {
                console.warn(`Error setting value for ${elementId}:`, error);
            }
        }
    }

    getValue(elementId) {
        const instance = this.instances.get(elementId);
        if (instance) {
            return instance.getValue(true);
        }
        return null;
    }

    clearChoices(elementId) {
        const instance = this.instances.get(elementId);
        if (instance) {
            try {
                instance.clearChoices();
            } catch (error) {
                console.warn(`Error clearing choices for ${elementId}:`, error);
            }
        }
    }

    setChoices(elementId, choices, value = 'value', label = 'label', replaceChoices = true) {
        const instance = this.instances.get(elementId);
        if (instance) {
            try {
                instance.setChoices(choices, value, label, replaceChoices);
            } catch (error) {
                console.warn(`Error setting choices for ${elementId}:`, error);
            }
        }
    }

    enable(elementId) {
        const instance = this.instances.get(elementId);
        if (instance) {
            instance.enable();
        }
    }

    disable(elementId) {
        const instance = this.instances.get(elementId);
        if (instance) {
            instance.disable();
        }
    }

    addEventListener(elementId, eventType, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, callback);
        }
    }

    // Convenience method to initialize all select elements with the searchable-select class
    initAll(selector = 'select.searchable-select') {
        const selects = document.querySelectorAll(selector);
        const instances = [];
        
        selects.forEach(select => {
            const instance = this.init(select.id);
            if (instance) {
                instances.push(instance);
            }
        });
        
        return instances;
    }

    destroyAll() {
        this.instances.forEach((instance, elementId) => {
            this.destroy(elementId);
        });
    }
}

// Create a global instance
window.searchableDropdown = new SearchableDropdown();