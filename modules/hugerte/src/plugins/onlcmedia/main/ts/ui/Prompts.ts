import Editor from 'hugerte/core/api/Editor';

/**
 * Small single field dialogs used by the explorer (new folder, rename, destination folder).
 */

export interface PromptSpec {
  readonly title: string;
  readonly label: string;
  readonly initialValue?: string;
  readonly submitText?: string;
  readonly onSubmit: (value: string) => void;
}

const open = (editor: Editor, spec: PromptSpec): void => {
  editor.windowManager.open<{ value: string }>({
    title: spec.title,
    size: 'normal',
    body: {
      type: 'panel',
      items: [
        { type: 'input', name: 'value', label: spec.label }
      ]
    },
    initialData: { value: spec.initialValue ?? '' },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: spec.submitText ?? 'Valider', primary: true }
    ],
    onSubmit: (api) => {
      const value = api.getData().value.trim();
      api.close();
      if (value !== '') {
        spec.onSubmit(value);
      }
    }
  });
};

const confirm = (editor: Editor, message: string, onConfirm: () => void): void => {
  editor.windowManager.confirm(message, (state) => {
    if (state) {
      onConfirm();
    }
  });
};

export {
  open,
  confirm
};
