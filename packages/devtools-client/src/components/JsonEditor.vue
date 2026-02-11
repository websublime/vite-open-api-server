<!--
  JsonEditor.vue - JSON Editor Component

  What: Editable JSON textarea with syntax highlighting and validation
  How: Uses a textarea with syntax validation and formatting utilities
  Why: Allows developers to edit mock data in a user-friendly interface

  Features:
  - Real-time JSON validation
  - Syntax error display
  - Format/prettify button
  - Line numbers
  - Monospace font
-->

<script setup lang="ts">
import { AlertCircle, Check } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';

/**
 * Component props
 */
interface Props {
  /** JSON data to edit (will be stringified) */
  modelValue: unknown;
  /** Whether the editor is read-only */
  readonly?: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Minimum height in pixels */
  minHeight?: number;
}

/**
 * Component emits
 */
interface Emits {
  (e: 'update:modelValue', value: unknown): void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  placeholder: 'Enter JSON data...',
  minHeight: 200,
});

const emit = defineEmits<Emits>();

// ==========================================================================
// State
// ==========================================================================

/** Current text content */
const text = ref<string>('');

/** JSON validation error */
const validationError = ref<string | null>(null);

/** Whether JSON is valid */
const isValid = computed(() => validationError.value === null);

/** Line count for line numbers */
const lineCount = computed(() => {
  return text.value.split('\n').length;
});

/** Line numbers array */
const lineNumbers = computed(() => {
  return Array.from({ length: lineCount.value }, (_, i) => i + 1);
});

// ==========================================================================
// Initialization
// ==========================================================================

/**
 * Initialize text from modelValue
 */
function initializeText(): void {
  try {
    text.value = JSON.stringify(props.modelValue, null, 2);
    validationError.value = null;
  } catch (err) {
    text.value = '';
    validationError.value = 'Invalid initial value';
  }
}

// Initialize on mount
initializeText();

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  () => {
    // Only update if the parsed value differs (avoid cursor jumps during typing)
    try {
      const currentParsed = JSON.parse(text.value);
      if (JSON.stringify(currentParsed) !== JSON.stringify(props.modelValue)) {
        initializeText();
      }
    } catch {
      // If current text is invalid, always update
      initializeText();
    }
  },
);

// ==========================================================================
// Actions
// ==========================================================================

/**
 * Handle text input
 */
function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  text.value = target.value;
  validateAndEmit();
}

/**
 * Validate JSON and emit update
 */
function validateAndEmit(): void {
  if (text.value.trim() === '') {
    validationError.value = null;
    emit('update:modelValue', []);
    return;
  }

  try {
    const parsed = JSON.parse(text.value);
    validationError.value = null;
    emit('update:modelValue', parsed);
  } catch (err) {
    if (err instanceof Error) {
      // Extract line/column info from error message
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = Number.parseInt(match[1], 10);
        const lines = text.value.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        validationError.value = `Line ${line}, Column ${column}: ${err.message}`;
      } else {
        validationError.value = err.message;
      }
    } else {
      validationError.value = 'Invalid JSON';
    }
  }
}

/**
 * Format/prettify the JSON
 */
function formatJson(): void {
  try {
    const parsed = JSON.parse(text.value);
    text.value = JSON.stringify(parsed, null, 2);
    validationError.value = null;
    emit('update:modelValue', parsed);
  } catch {
    // If invalid, do nothing
  }
}

/**
 * Handle Tab key for indentation
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    event.preventDefault();
    const target = event.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    // Insert 2 spaces
    const newText = `${text.value.substring(0, start)}  ${text.value.substring(end)}`;
    text.value = newText;

    // Move cursor
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    }, 0);

    validateAndEmit();
  }
}

// ==========================================================================
// Expose methods
// ==========================================================================

defineExpose({
  formatJson,
  isValid,
});
</script>

<template>
  <div class="json-editor">
    <!-- Editor Container -->
    <div class="json-editor__container">
      <!-- Line Numbers -->
      <div class="json-editor__lines" aria-hidden="true">
        <div
          v-for="lineNum in lineNumbers"
          :key="lineNum"
          class="json-editor__line-number"
        >
          {{ lineNum }}
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        :value="text"
        :readonly="readonly"
        :placeholder="placeholder"
        :style="{ '--json-editor-min-height': `${minHeight}px` }"
        class="json-editor__textarea"
        spellcheck="false"
        @input="handleInput"
        @keydown="handleKeyDown"
      />
    </div>

    <!-- Status Bar -->
    <div class="json-editor__status">
      <div class="json-editor__status-left">
        <!-- Validation Status -->
        <div v-if="isValid" class="json-editor__valid">
          <Check :size="14" />
          <span>Valid JSON</span>
        </div>
        <div v-else-if="validationError" class="json-editor__error">
          <AlertCircle :size="14" />
          <span>{{ validationError }}</span>
        </div>
      </div>

      <div class="json-editor__status-right">
        <!-- Line Count -->
        <span class="json-editor__info">{{ lineCount }} lines</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-editor {
  display: flex;
  flex-direction: column;
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-md);
  overflow: hidden;
  height: 100%;
  width: 100%;
}

/* Editor Container */
.json-editor__container {
  display: flex;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

/* Line Numbers */
.json-editor__lines {
  display: flex;
  flex-direction: column;
  padding: var(--devtools-space-sm) var(--devtools-space-xs);
  background-color: var(--devtools-surface-elevated);
  border-right: 1px solid var(--devtools-border);
  user-select: none;
  flex-shrink: 0;
  overflow: hidden;
}

.json-editor__line-number {
  height: 1.5em;
  line-height: 1.5;
  text-align: right;
  font-family: var(--devtools-font-mono);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
  min-width: 2ch;
  padding-right: var(--devtools-space-xs);
}

/* Textarea */
.json-editor__textarea {
  flex: 1;
  width: 0;
  padding: var(--devtools-space-sm);
  background-color: var(--devtools-surface);
  color: var(--devtools-text);
  border: none;
  outline: none;
  resize: none;
  font-family: var(--devtools-font-mono);
  font-size: var(--font-size-0);
  line-height: 1.5;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  overflow: auto;
  min-height: var(--json-editor-min-height, 0);
}

.json-editor__textarea::placeholder {
  color: var(--devtools-text-muted);
  opacity: 0.6;
}

.json-editor__textarea:focus {
  outline: 2px solid var(--devtools-primary);
  outline-offset: -2px;
}

.json-editor__textarea[readonly] {
  background-color: var(--devtools-surface-elevated);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Status Bar */
.json-editor__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface-elevated);
  border-top: 1px solid var(--devtools-border);
  font-size: var(--font-size-0);
}

.json-editor__status-left,
.json-editor__status-right {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
}

/* Validation Indicators */
.json-editor__valid {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  color: var(--devtools-success);
}

.json-editor__error {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  color: var(--devtools-error);
}

.json-editor__info {
  color: var(--devtools-text-muted);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .json-editor__textarea {
    color: #e2e8f0;
  }

  .json-editor__textarea::placeholder {
    color: #64748b;
  }
}
</style>
