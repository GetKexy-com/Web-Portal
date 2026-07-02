import {
  Component, inject, signal, computed, HostListener, ViewChild,
  ElementRef, TemplateRef, AfterViewInit, OnDestroy, NgZone,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EditorStateService } from '../services/editor-state.service';
import { MergeTagService } from '../services/merge-tag.service';
import { EditorCanvasComponent } from './editor-canvas.component';

/** A collapsible toolbar cluster. Lower `priority` collapses into the ⋮ menu first. */
interface ToolbarGroup {
  id: string;
  priority: number;
}

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="toolbar-strip">
      <div class="toolbar-scroll" #toolbarScroll>

        <!-- Visible clusters (in display order). Each collapses into the ⋮ menu,
             lowest-priority first, when the strip runs out of width. -->
        @for (g of visibleGroups(); track g.id) {
          <div class="tb-group" [attr.data-group]="g.id">
            <ng-container [ngTemplateOutlet]="templates[g.id]"></ng-container>
            <span class="tool-divider"></span>
          </div>
        }

        <!-- Overflow (⋮): shown ONLY when at least one cluster is collapsed. It
             holds those collapsed clusters (every cluster — including color /
             video / merge tag — otherwise lives in the strip when it fits). -->
        @if (overflowGroups().length) {
          <span class="tool-divider before-overflow"></span>
          <div class="overflow-tool" #overflowTool>
            <button type="button"
              class="tool-btn"
              title="More tools"
              aria-label="More tools"
              [class.active]="overflowOpen()"
              (click)="toggleOverflow()"
            >
              <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><circle cx="9.5" cy="4.5" r="1.5"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="9.5" cy="16.5" r="1.5"/></svg>
            </button>
            @if (overflowOpen()) {
              <div class="overflow-menu" role="menu">
                @for (g of overflowGroups(); track g.id) {
                  <div class="tb-group overflow-group" [attr.data-group]="g.id">
                    <ng-container [ngTemplateOutlet]="templates[g.id]"></ng-container>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ── Collapsible cluster definitions (rendered into the strip OR the ⋮ menu) ── -->

    <ng-template #tplSource>
      <button type="button" class="tool-btn" [class.active]="state.sourceMode()" title="Source code" (click)="canvas?.toggleSourceMode()">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m12.5 0 5 4.5v15.003h-16V0h11zM3 1.5v3.25l-1.497 1-.003 8 1.5 1v3.254L7.685 18l-.001 1.504H17.5V8.002L16 9.428l-.004-4.22-4.222-3.692L3 1.5z"/><path d="M4.06 6.64a.75.75 0 0 1 .958 1.15l-.085.07L2.29 9.75l2.646 1.89c.302.216.4.62.232.951l-.058.095a.75.75 0 0 1-.951.232l-.095-.058-3.5-2.5V9.14l3.496-2.5zm4.194 6.22a.75.75 0 0 1-.958-1.149l.085-.07 2.643-1.89-2.646-1.89a.75.75 0 0 1-.232-.952l.058-.095a.75.75 0 0 1 .95-.232l.096.058 3.5 2.5v1.22l-3.496 2.5zm7.644-.836 2.122 2.122-5.825 5.809-2.125-.005.003-2.116zm2.539-1.847 1.414 1.414a.5.5 0 0 1 0 .707l-1.06 1.06-2.122-2.12 1.061-1.061a.5.5 0 0 1 .707 0z"/></svg>
        <span>Source</span>
      </button>
    </ng-template>

    <ng-template #tplLists>
      <button type="button" class="tool-btn" title="Bullet list" [class.active]="ulActive()" (click)="format('insertUnorderedList')">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5.75c0 .414.336.75.75.75h9.5a.75.75 0 1 0 0-1.5h-9.5a.75.75 0 0 0-.75.75zm-6 0C1 4.784 1.777 4 2.75 4c.966 0 1.75.777 1.75 1.75 0 .966-.777 1.75-1.75 1.75C1.784 7.5 1 6.723 1 5.75zm6 9c0 .414.336.75.75.75h9.5a.75.75 0 1 0 0-1.5h-9.5a.75.75 0 0 0-.75.75zm-6 0c0-.966.777-1.75 1.75-1.75.966 0 1.75.777 1.75 1.75 0 .966-.777 1.75-1.75 1.75-.966 0-1.75-.777-1.75-1.75z"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Numbered list" [class.active]="olActive()" (click)="format('insertOrderedList')">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5.75c0 .414.336.75.75.75h9.5a.75.75 0 1 0 0-1.5h-9.5a.75.75 0 0 0-.75.75zM3.5 3v5H2V3.7H1v-1h2.5V3zM.343 17.857l2.59-3.257H2.92a.6.6 0 1 0-1.04 0H.302a2 2 0 1 1 3.995 0h-.001c-.048.405-.16.734-.333.988-.175.254-.59.692-1.244 1.312H4.3v1h-4l.043-.043zM7 14.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 1 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75z"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Checklist" (click)="canvas?.insertChecklist()">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m2.315 14.705 2.224-2.24a.689.689 0 0 1 .963 0 .664.664 0 0 1 0 .949L2.865 16.07a.682.682 0 0 1-.112.089.647.647 0 0 1-.852-.051L.688 14.886a.635.635 0 0 1 0-.903.647.647 0 0 1 .91 0l.717.722zm5.185.045a.75.75 0 0 1 .75-.75h9.5a.75.75 0 1 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75zM2.329 5.745l2.21-2.226a.689.689 0 0 1 .963 0 .664.664 0 0 1 0 .95L2.865 7.125a.685.685 0 0 1-.496.196.644.644 0 0 1-.468-.187L.688 5.912a.635.635 0 0 1 0-.903.647.647 0 0 1 .91 0l.73.736zM7.5 5.75A.75.75 0 0 1 8.25 5h9.5a.75.75 0 1 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75z"/></svg>
      </button>
    </ng-template>

    <ng-template #tplAlign>
      <div class="align-tool">
        <button type="button" class="tool-btn with-caret" title="Text alignment" [class.active]="alignOpen()" (click)="toggleAlign()">
          <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3.75c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 8c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 4c0 .414.336.75.75.75h9.929a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0-8c0 .414.336.75.75.75h9.929a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75z"/></svg>
          <svg class="tool-ic caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        @if (alignOpen()) {
          <div class="align-menu" role="menu">
            <button type="button" class="tool-btn" title="Align left" (click)="applyAlign('justifyLeft')">
              <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3.75c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 8c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 4c0 .414.336.75.75.75h9.929a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0-8c0 .414.336.75.75.75h9.929a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75z"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Align center" (click)="applyAlign('justifyCenter')">
              <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3.75c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 8c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm2.286 4c0 .414.336.75.75.75h9.928a.75.75 0 1 0 0-1.5H5.036a.75.75 0 0 0-.75.75zm0-8c0 .414.336.75.75.75h9.928a.75.75 0 1 0 0-1.5H5.036a.75.75 0 0 0-.75.75z"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Align right" (click)="applyAlign('justifyRight')">
              <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3.75a.75.75 0 0 1-.75.75H2.75a.75.75 0 1 1 0-1.5h14.5a.75.75 0 0 1 .75.75zm0 8a.75.75 0 0 1-.75.75H2.75a.75.75 0 1 1 0-1.5h14.5a.75.75 0 0 1 .75.75zm0 4a.75.75 0 0 1-.75.75H7.321a.75.75 0 1 1 0-1.5h9.929a.75.75 0 0 1 .75.75zm0-8a.75.75 0 0 1-.75.75H7.321a.75.75 0 1 1 0-1.5h9.929a.75.75 0 0 1 .75.75z"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Justify" (click)="applyAlign('justifyFull')">
              <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3.75c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 8c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0 4c0 .414.336.75.75.75h9.929a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75zm0-8c0 .414.336.75.75.75h14.5a.75.75 0 1 0 0-1.5H2.75a.75.75 0 0 0-.75.75z"/></svg>
            </button>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #tplHistory>
      <button type="button" class="tool-btn" title="Undo" (click)="canvas?.execCommand('undo')">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m5.042 9.367 2.189 1.837a.75.75 0 0 1-.965 1.149l-3.788-3.18a.747.747 0 0 1-.21-.284.75.75 0 0 1 .17-.945L6.23 4.762a.75.75 0 1 1 .964 1.15L4.863 7.866h8.917A.75.75 0 0 1 14 7.9a4 4 0 1 1-1.477 7.718l.344-1.489a2.5 2.5 0 1 0 1.094-4.73l.008-.032H5.042z"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Redo" (click)="canvas?.execCommand('redo')">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m14.958 9.367-2.189 1.837a.75.75 0 0 0 .965 1.149l3.788-3.18a.747.747 0 0 0 .21-.284.75.75 0 0 0-.17-.945L13.77 4.762a.75.75 0 1 0-.964 1.15l2.331 1.955H6.22A.75.75 0 0 0 6 7.9a4 4 0 1 0 1.477 7.718l-.344-1.489A2.5 2.5 0 1 1 6.039 9.4l-.008-.032h8.927z"/></svg>
      </button>
    </ng-template>

    <ng-template #tplInsert>
      <button type="button" class="tool-btn" title="Insert image" (click)="imageFileInput.click()">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M1.201 1C.538 1 0 1.47 0 2.1v14.363c0 .64.534 1.037 1.186 1.037h9.494a2.97 2.97 0 0 1-.414-.287 2.998 2.998 0 0 1-1.055-2.03 3.003 3.003 0 0 1 .693-2.185l.383-.455-.02.018-3.65-3.41a.695.695 0 0 0-.957-.034L1.5 13.6V2.5h15v5.535a2.97 2.97 0 0 1 1.412.932l.088.105V2.1c0-.63-.547-1.1-1.2-1.1H1.202Zm11.713 2.803a2.146 2.146 0 0 0-2.049 1.992 2.14 2.14 0 0 0 1.28 2.096 2.13 2.13 0 0 0 2.644-3.11 2.134 2.134 0 0 0-1.875-.978Z"/><path d="M15.522 19.1a.79.79 0 0 0 .79-.79v-5.373l2.059 2.455a.79.79 0 1 0 1.211-1.015l-3.352-3.995a.79.79 0 0 0-.995-.179.784.784 0 0 0-.299.221l-3.35 3.99a.79.79 0 1 0 1.21 1.017l1.936-2.306v5.185c0 .436.353.79.79.79Z"/></svg>
      </button>
      <button type="button" class="tool-btn link-tool-btn" title="Insert link" [class.active]="linkActive()" (click)="canvas?.openLinkPopover($event)">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m11.077 15 .991-1.416a.75.75 0 1 1 1.229.86l-1.148 1.64a.748.748 0 0 1-.217.206 5.251 5.251 0 0 1-8.503-5.955.741.741 0 0 1 .12-.274l1.147-1.639a.75.75 0 1 1 1.228.86L4.933 10.7l.006.003a3.75 3.75 0 0 0 6.132 4.294l.006.004zm5.494-5.335a.748.748 0 0 1-.12.274l-1.147 1.639a.75.75 0 1 1-1.228-.86l.86-1.23a3.75 3.75 0 0 0-6.144-4.301l-.86 1.229a.75.75 0 0 1-1.229-.86l1.148-1.64a.748.748 0 0 1 .217-.206 5.251 5.251 0 0 1 8.503 5.955zm-4.563-2.532a.75.75 0 0 1 .184 1.045l-3.155 4.505a.75.75 0 1 1-1.229-.86l3.155-4.506a.75.75 0 0 1 1.045-.184z"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Remove link" (click)="canvas?.unlink()">
        <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m11.077 15 .991-1.416a.75.75 0 1 1 1.229.86l-1.148 1.64a.748.748 0 0 1-.217.206 5.251 5.251 0 0 1-8.503-5.955.741.741 0 0 1 .12-.274l1.147-1.639a.75.75 0 1 1 1.228.86L4.933 10.7l.006.003a3.75 3.75 0 0 0 6.132 4.294l.006.004zm5.494-5.335a.748.748 0 0 1-.12.274l-1.147 1.639a.75.75 0 1 1-1.228-.86l.86-1.23a3.75 3.75 0 0 0-6.144-4.301l-.86 1.229a.75.75 0 0 1-1.229-.86l1.148-1.64a.748.748 0 0 1 .217-.206 5.251 5.251 0 0 1 8.503 5.955zm-4.563-2.532a.75.75 0 0 1 .184 1.045l-3.155 4.505a.75.75 0 1 1-1.229-.86l3.155-4.506a.75.75 0 0 1 1.045-.184zm4.919 10.562-1.414 1.414a.75.75 0 1 1-1.06-1.06l1.414-1.415-1.415-1.414a.75.75 0 0 1 1.061-1.06l1.414 1.414 1.414-1.415a.75.75 0 0 1 1.061 1.061l-1.414 1.414 1.414 1.415a.75.75 0 0 1-1.06 1.06l-1.415-1.414z"/></svg>
      </button>
      <div class="table-tool">
        <button type="button" class="tool-btn with-caret" title="Insert table" [class.active]="tableOpen()" (click)="toggleTable()">
          <svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5.5v3h4v-3H3Zm0 4v3h4v-3H3Zm0 4v3h4v-3H3Zm5 3h4v-3H8v3Zm5 0h4v-3h-4v3Zm4-4v-3h-4v3h4Zm0-4v-3h-4v3h4Zm1.5 8A1.5 1.5 0 0 1 17 18H3a1.5 1.5 0 0 1-1.5-1.5V3c.222-.863 1.068-1.5 2-1.5h13c.932 0 1.778.637 2 1.5v13.5Zm-6.5-4v-3H8v3h4Zm0-4v-3H8v3h4Z"/></svg>
          <svg class="tool-ic caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        @if (tableOpen()) {
          <div class="table-menu" role="menu">
            <div class="table-grid"
              [style.grid-template-columns]="'repeat(' + gridCols() + ', 1fr)'"
              (mouseleave)="onTableHover(0, 0)">
              @for (r of gridRowRange(); track r) {
                @for (c of gridColRange(); track c) {
                  <span class="table-cell"
                    [class.on]="r <= tableRows() && c <= tableCols()"
                    (mouseenter)="onTableHover(r, c)"
                    (click)="pickTable(r, c)"></span>
                }
              }
            </div>
            <div class="table-grid-label">{{ tableCols() }} &times; {{ tableRows() }}</div>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #tplParagraph>
      <select class="tool-select format-select" (change)="onBlockFormat($event)">
        <option value="P">Paragraph</option>
        <option value="H1">Heading 1</option>
        <option value="H2">Heading 2</option>
        <option value="H3">Heading 3</option>
        <option value="BLOCKQUOTE">Quote</option>
      </select>
    </ng-template>

    <ng-template #tplFontFamily>
      <select class="tool-select font-select" [style.font-family]="fontFamily()"
        (mousedown)="canvas?.captureMergeSelection()" (change)="onFontName($event)">
        @for (font of fontFamilies; track font.value) {
          <option [value]="font.value" [style.font-family]="font.value"
            [selected]="font.value === fontFamily()">{{ font.label }}</option>
        }
      </select>
    </ng-template>

    <ng-template #tplFontSize>
      <select class="tool-select mini-select"
        (mousedown)="canvas?.captureMergeSelection()" (change)="onFontSize($event)">
        @for (size of fontSizes; track size) {
          <option [value]="size + 'px'" [selected]="(size + 'px') === fontSize()">{{ size }}</option>
        }
      </select>
    </ng-template>

    <ng-template #tplTextFormat>
      <button type="button" class="tool-btn fmt" title="Bold" [class.active]="boldActive()" (click)="format('bold')"><svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M10.187 17H5.773c-.637 0-1.092-.138-1.364-.415-.273-.277-.409-.718-.409-1.323V4.738c0-.617.14-1.062.419-1.332.279-.27.73-.406 1.354-.406h4.68c.69 0 1.288.041 1.793.124.506.083.96.242 1.36.478.341.197.644.447.906.75a3.262 3.262 0 0 1 .808 2.162c0 1.401-.722 2.426-2.167 3.075C15.05 10.175 16 11.315 16 13.01a3.756 3.756 0 0 1-2.296 3.504 6.1 6.1 0 0 1-1.517.377c-.571.073-1.238.11-2 .11zm-.217-6.217H7v4.087h3.069c1.977 0 2.965-.69 2.965-2.072 0-.707-.256-1.22-.768-1.537-.512-.319-1.277-.478-2.296-.478zM7 5.13v3.619h2.606c.729 0 1.292-.067 1.69-.2a1.6 1.6 0 0 0 .91-.765c.165-.267.247-.566.247-.897 0-.707-.26-1.176-.778-1.409-.519-.232-1.31-.348-2.375-.348H7z"/></svg></button>
      <button type="button" class="tool-btn fmt" title="Italic" [class.active]="italicActive()" (click)="format('italic')"><svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="m9.586 14.633.021.004c-.036.335.095.655.393.962.082.083.173.15.274.201h1.474a.6.6 0 1 1 0 1.2H5.304a.6.6 0 0 1 0-1.2h1.15c.474-.07.809-.182 1.005-.334.157-.122.291-.32.404-.597l2.416-9.55a1.053 1.053 0 0 0-.281-.823 1.12 1.12 0 0 0-.442-.296H8.15a.6.6 0 0 1 0-1.2h6.443a.6.6 0 1 1 0 1.2h-1.195c-.376.056-.65.155-.823.296-.215.175-.423.439-.623.79l-2.366 9.347z"/></svg></button>
      <button type="button" class="tool-btn fmt" title="Underline" [class.active]="underlineActive()" (click)="format('underline')"><svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M3 18v-1.5h14V18zm2.2-8V3.6c0-.4.4-.6.8-.6.3 0 .7.2.7.6v6.2c0 2 1.3 2.8 3.2 2.8 1.9 0 3.4-.9 3.4-2.9V3.6c0-.3.4-.5.8-.5.3 0 .7.2.7.5V10c0 2.7-2.2 4-4.9 4-2.6 0-4.7-1.2-4.7-4z"/></svg></button>
      <button type="button" class="tool-btn fmt" title="Strikethrough" [class.active]="strikeActive()" (click)="format('strikeThrough')"><svg class="tool-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M7 16.4c-.8-.4-1.5-.9-2.2-1.5a.6.6 0 0 1-.2-.5l.3-.6h1c1 1.2 2.1 1.7 3.7 1.7 1 0 1.8-.3 2.3-.6.6-.4.6-1.2.6-1.3.2-1.2-.9-2.1-.9-2.1h2.1c.3.7.4 1.2.4 1.7v.8l-.6 1.2c-.6.8-1.1 1-1.6 1.2a6 6 0 0 1-2.4.6c-1 0-1.8-.3-2.5-.6zM6.8 9 6 8.3c-.4-.5-.5-.8-.5-1.6 0-.7.1-1.3.5-1.8.4-.6 1-1 1.6-1.3a6.3 6.3 0 0 1 4.7 0 4 4 0 0 1 1.7 1l.3.7c0 .1.2.4-.2.7-.4.2-.9.1-1 0a3 3 0 0 0-1.2-1c-.4-.2-1-.3-2-.4-.7 0-1.4.2-2 .6-.8.6-1 .8-1 1.5 0 .8.5 1 1.2 1.5.6.4 1.1.7 1.9 1H6.8z"/><path d="M3 10.5V9h14v1.5z"/></svg></button>
    </ng-template>

    <ng-template #tplColor>
      <!-- Text / highlight color. The native picker steals focus, so we wrap the
           selection on mousedown (while it's still alive), restyle it live on
           input (real-time preview as the picker is dragged), and finalize on
           change/blur. See beginColorPreview/updateColorPreview/endColorPreview. -->
      <input #textColor class="color-input" type="color" value="#1f2937" title="Text color"
             (mousedown)="canvas?.beginColorPreview('foreColor')"
             (input)="canvas?.updateColorPreview(textColor.value)"
             (change)="canvas?.endColorPreview()"
             (blur)="canvas?.endColorPreview()" />
      <input #highlightColor class="color-input" type="color" value="#fff2b2" title="Highlight color"
             (mousedown)="canvas?.beginColorPreview('hiliteColor')"
             (input)="canvas?.updateColorPreview(highlightColor.value)"
             (change)="canvas?.endColorPreview()"
             (blur)="canvas?.endColorPreview()" />
    </ng-template>

    <ng-template #tplVideo>
      <button type="button" class="tool-btn with-label" title="Insert video" (click)="videoFileInput.click()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
        <span>Video</span>
      </button>
    </ng-template>

    <ng-template #tplMerge>
      <div class="merge-tag-tool">
        <button type="button"
          class="tool-btn with-label"
          title="Insert merge tag"
          aria-label="Insert merge tag"
          [class.active]="menuOpen()"
          (click)="toggleMergeMenu()"
        >
          <span class="hash">#</span><span>Merge tag</span>
        </button>
        @if (menuOpen()) {
          <div class="merge-tag-menu" role="menu">
            <input
              #mergeSearch
              class="merge-tag-search"
              type="text"
              placeholder="Search merge tags"
              [value]="mergeQuery()"
              (input)="onMergeSearch($event)"
            />
            <div class="merge-tag-list">
              @for (tag of filteredTags(); track tag.key) {
                <button
                  type="button"
                  class="merge-tag-option"
                  role="menuitem"
                  (click)="pickMergeTag(tag.key)"
                >
                  <span class="merge-tag-badge">#</span>
                  <span class="merge-tag-option-label">{{ tag.label }}</span>
                </button>
              } @empty {
                <p class="merge-tag-empty">No matching tags</p>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>

    <input #imageFileInput type="file" accept="image/*" hidden (change)="onImageFile($event)" />
    <input #videoFileInput type="file" accept="video/*" hidden (change)="onVideoFile($event)" />
  `
})
export class EditorToolbarComponent implements AfterViewInit, OnDestroy {
  readonly state = inject(EditorStateService);
  readonly mergeTags = inject(MergeTagService);
  private readonly zone = inject(NgZone);
  canvas: EditorCanvasComponent | null = null;

  /**
   * Optional uploader wired in by the host editor component. Given the image as
   * a base64 data URL (encoded once here), it uploads and resolves the hosted
   * image URL to use as the block src. When unset, images fall back to the inline
   * data URL.
   */
  uploadImage: ((imageData: string) => Promise<string>) | null = null;

  @ViewChild('mergeSearch') mergeSearchRef?: ElementRef<HTMLInputElement>;

  // ── Responsive overflow: clusters flow into the ⋮ menu instead of wrapping ──
  // The toolbar NEVER wraps to a second row (`.toolbar-scroll` is flex-nowrap).
  // A ResizeObserver measures the available width and pushes the lowest-priority
  // clusters into the overflow menu until the rest fit on one line.
  @ViewChild('toolbarScroll') toolbarScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('overflowTool') overflowToolRef!: ElementRef<HTMLElement>;
  @ViewChild('tplSource') tplSource!: TemplateRef<unknown>;
  @ViewChild('tplLists') tplLists!: TemplateRef<unknown>;
  @ViewChild('tplAlign') tplAlign!: TemplateRef<unknown>;
  @ViewChild('tplHistory') tplHistory!: TemplateRef<unknown>;
  @ViewChild('tplInsert') tplInsert!: TemplateRef<unknown>;
  @ViewChild('tplParagraph') tplParagraph!: TemplateRef<unknown>;
  @ViewChild('tplFontFamily') tplFontFamily!: TemplateRef<unknown>;
  @ViewChild('tplFontSize') tplFontSize!: TemplateRef<unknown>;
  @ViewChild('tplTextFormat') tplTextFormat!: TemplateRef<unknown>;
  @ViewChild('tplColor') tplColor!: TemplateRef<unknown>;
  @ViewChild('tplVideo') tplVideo!: TemplateRef<unknown>;
  @ViewChild('tplMerge') tplMerge!: TemplateRef<unknown>;

  /** id → TemplateRef, assembled in ngAfterViewInit (used by both render slots). */
  templates: Record<string, TemplateRef<unknown>> = {};

  /**
   * Clusters in DISPLAY order. `priority` controls collapse order — the LOWEST
   * priority is the first to move into the ⋮ menu when the strip is too narrow
   * (so Bold/Italic/… and Source survive the longest).
   */
  private readonly GROUPS: ReadonlyArray<ToolbarGroup> = [
    { id: 'source',     priority: 90 },
    { id: 'lists',      priority: 70 },
    { id: 'align',      priority: 50 },
    { id: 'history',    priority: 75 },
    { id: 'insert',     priority: 60 },
    { id: 'paragraph',  priority: 40 },
    { id: 'fontFamily', priority: 30 },
    { id: 'fontSize',   priority: 25 },
    { id: 'textFormat', priority: 85 },
    // Secondary tools: shown in the strip when there's room, first to collapse.
    { id: 'color',      priority: 20 },
    { id: 'video',      priority: 15 },
    { id: 'mergeTag',   priority: 10 },
  ];

  /** ids currently collapsed into the ⋮ menu. */
  private readonly overflowIds = signal<ReadonlySet<string>>(new Set());
  readonly visibleGroups = computed(() => this.GROUPS.filter(g => !this.overflowIds().has(g.id)));
  readonly overflowGroups = computed(() => this.GROUPS.filter(g => this.overflowIds().has(g.id)));

  /** Cached natural width per cluster (stable — measured while in the strip). */
  private readonly widthCache = new Map<string, number>();
  /** Cached ⋮ button width (it's only in the DOM while something is collapsed). */
  private overflowBtnWidth = 40;
  private resizeObserver?: ResizeObserver;
  private recomputeFrame = 0;

  /** Approved font-family list (each option previews in its own face). */
  readonly fontFamilies: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'Arial, sans-serif',                  label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif',       label: 'Helvetica' },
    { value: 'Verdana, sans-serif',                label: 'Verdana' },
    { value: 'Tahoma, sans-serif',                 label: 'Tahoma' },
    { value: 'Trebuchet MS, sans-serif',           label: 'Trebuchet MS' },
    { value: 'Gill Sans, sans-serif',              label: 'Gill Sans' },
    { value: 'Lucida Sans Unicode, sans-serif',    label: 'Lucida Sans' },
    { value: 'Segoe UI, Arial, sans-serif',        label: 'Segoe UI' },
    { value: 'Geneva, sans-serif',                 label: 'Geneva' },
    { value: 'Georgia, serif',                     label: 'Georgia' },
    { value: 'Times New Roman, serif',             label: 'Times New Roman' },
    { value: 'Palatino, serif',                    label: 'Palatino' },
    { value: 'Garamond, serif',                    label: 'Garamond' },
    { value: 'Baskerville, serif',                 label: 'Baskerville' },
    { value: 'Cambria, serif',                     label: 'Cambria' },
    { value: 'Courier New, monospace',             label: 'Courier New' },
    { value: 'Lucida Console, monospace',          label: 'Lucida Console' },
    { value: 'Monaco, monospace',                  label: 'Monaco' },
    { value: 'Impact, sans-serif',                 label: 'Impact' },
    { value: 'Arial Black, sans-serif',            label: 'Arial Black' },
    { value: 'Comic Sans MS, cursive',             label: 'Comic Sans MS' },
  ];

  /** Approved font-size list (px). */
  readonly fontSizes: ReadonlyArray<number> = [
    8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72,
  ];

  /** Currently-selected font family (drives the <select>'s value + preview face). */
  readonly fontFamily = signal(this.fontFamilies[0].value);
  /** Currently-selected font size, e.g. '14px' (drives the size <select>'s value). */
  readonly fontSize = signal('14px');

  // Active-state of the format buttons, synced to the current selection so the
  // toolbar reflects whether the highlighted text is bold/italic/etc.
  readonly boldActive = signal(false);
  readonly italicActive = signal(false);
  readonly underlineActive = signal(false);
  readonly strikeActive = signal(false);
  readonly ulActive = signal(false);
  readonly olActive = signal(false);
  readonly linkActive = signal(false);

  readonly overflowOpen = signal(false);
  readonly alignOpen = signal(false);
  readonly menuOpen = signal(false);

  // ── Table grid picker (CKEditor-style: hover a cell to size the table) ──
  /** Base grid dimensions; grow by one when the pointer reaches the last row/col. */
  private static readonly TABLE_GRID_BASE = 10;
  private static readonly TABLE_GRID_MAX = 20;
  readonly tableOpen = signal(false);
  /** Rendered grid extent (grows as the pointer nears the edge, like CKEditor). */
  readonly gridRows = signal(EditorToolbarComponent.TABLE_GRID_BASE);
  readonly gridCols = signal(EditorToolbarComponent.TABLE_GRID_BASE);
  /** Currently-hovered dimensions (0 = nothing highlighted). */
  readonly tableRows = signal(0);
  readonly tableCols = signal(0);
  readonly gridRowRange = computed(() => Array.from({ length: this.gridRows() }, (_, i) => i + 1));
  readonly gridColRange = computed(() => Array.from({ length: this.gridCols() }, (_, i) => i + 1));

  readonly mergeQuery = signal('');
  readonly filteredTags = computed(() => {
    const query = this.mergeQuery().trim().toLowerCase();
    const all = this.mergeTags.getAll();
    if (!query) return all;
    return all.filter(t =>
      t.label.toLowerCase().includes(query) || t.key.toLowerCase().includes(query)
    );
  });

  ngAfterViewInit(): void {
    this.templates = {
      source: this.tplSource,
      lists: this.tplLists,
      align: this.tplAlign,
      history: this.tplHistory,
      insert: this.tplInsert,
      paragraph: this.tplParagraph,
      fontFamily: this.tplFontFamily,
      fontSize: this.tplFontSize,
      textFormat: this.tplTextFormat,
      color: this.tplColor,
      video: this.tplVideo,
      mergeTag: this.tplMerge,
    };
    // `templates` is a plain prop, so force ONE render (fresh Set reference
    // notifies even though the overflow set is unchanged) — that makes the
    // ngTemplateOutlets pick up the just-assigned TemplateRefs and lay the
    // clusters out at full width. THEN measure on the next frame, once that
    // layout has painted, and collapse whatever doesn't fit.
    //
    // We can't rely on the ResizeObserver alone for this first pass: it watches
    // `.toolbar-scroll`, whose box is parent-sized and `overflow:hidden`, so the
    // clusters rendering into it does NOT change its size → no RO callback. RO
    // still handles genuine width changes (offcanvas/window resize) after that.
    queueMicrotask(() => {
      this.overflowIds.set(new Set(this.overflowIds()));
      this.scheduleRecompute();
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRecompute());
      this.resizeObserver.observe(this.toolbarScrollRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.recomputeFrame) cancelAnimationFrame(this.recomputeFrame);
  }

  /**
   * Measure + collapse on the next frame (so we read a settled, painted layout),
   * coalescing bursts of RO callbacks into a single pass. Runs inside the Angular
   * zone so the resulting `overflowIds` change drives change detection.
   */
  private scheduleRecompute(): void {
    if (this.recomputeFrame) cancelAnimationFrame(this.recomputeFrame);
    this.recomputeFrame = requestAnimationFrame(() => {
      this.recomputeFrame = 0;
      this.zone.run(() => this.recomputeOverflow());
    });
  }

  /**
   * Measure the clusters currently in the strip (cache their widths), then decide
   * which fit on one line — highest priority first — and push the rest into ⋮.
   * The ⋮ button is only rendered when something overflows, so its width is
   * reserved ONLY in that case (otherwise everything gets the full strip width).
   */
  private recomputeOverflow(): void {
    const scroll = this.toolbarScrollRef?.nativeElement;
    if (!scroll) return;

    // Cache natural widths of whatever is currently rendered in the strip, plus
    // the ⋮ button's width whenever it's present (it comes and goes).
    scroll.querySelectorAll<HTMLElement>(':scope > .tb-group[data-group]').forEach(el => {
      const id = el.getAttribute('data-group');
      if (id) this.widthCache.set(id, el.getBoundingClientRect().width);
    });
    const overflowBtn = this.overflowToolRef?.nativeElement;
    if (overflowBtn) this.overflowBtnWidth = overflowBtn.getBoundingClientRect().width;

    const style = getComputedStyle(scroll);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const inner = scroll.clientWidth - padding - 4; // small safety buffer

    // Total width if EVERY cluster stayed in the strip (widths are all cached
    // after the first all-visible pass). If it fits, show all and hide ⋮.
    const totalWidth = this.GROUPS.reduce((sum, g) => sum + (this.widthCache.get(g.id) ?? 0) + gap, 0);

    let next: Set<string>;
    if (totalWidth <= inner) {
      next = new Set();
    } else {
      // Overflowing → the ⋮ button (and its leading `.before-overflow` divider,
      // ~14px incl. margins/gaps) will show, so reserve their width. Greedily
      // keep clusters by priority (desc); once one doesn't fit, everything below
      // its priority overflows too (predictable, contiguous collapse).
      const available = inner - this.overflowBtnWidth - gap - 14;
      const byPriority = [...this.GROUPS].sort((a, b) => b.priority - a.priority);
      const keep = new Set<string>();
      let used = 0;
      for (const g of byPriority) {
        const width = this.widthCache.get(g.id);
        if (width == null) { keep.add(g.id); continue; } // not yet measured — keep so it can be
        if (used + width + gap <= available) {
          used += width + gap;
          keep.add(g.id);
        } else {
          break;
        }
      }
      next = new Set(this.GROUPS.filter(g => !keep.has(g.id)).map(g => g.id));
    }

    // Nothing collapsed → the ⋮ disappears; make sure its menu isn't left "open"
    // so it doesn't auto-pop the next time a cluster collapses.
    if (next.size === 0 && this.overflowOpen()) this.overflowOpen.set(false);
    if (!this.setsEqual(next, this.overflowIds())) this.overflowIds.set(next);
  }

  private setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  toggleOverflow(): void {
    const opening = !this.overflowOpen();
    this.overflowOpen.set(opening);
    if (!opening) this.menuOpen.set(false);
  }

  /** Point the font/size dropdowns at the current selection's font. */
  private syncFontControls(): void {
    const family = this.canvas?.getSelectionFontFamily();
    if (family) {
      const first = this.normalizeFamily(family);
      const match = this.fontFamilies.find(f => this.normalizeFamily(f.value) === first);
      if (match) this.fontFamily.set(match.value);
    }
    const size = this.canvas?.getSelectionFontSize();
    if (size) {
      const px = parseInt(size, 10);
      const closest = this.fontSizes.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a);
      this.fontSize.set(closest + 'px');
    }
  }

  /** First family token, lower-cased and unquoted, for fuzzy matching. */
  private normalizeFamily(value: string): string {
    return (value.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase();
  }

  toggleAlign(): void {
    this.alignOpen.update(v => !v);
  }

  /** Open/close the table grid picker, resetting the grid to its base size. */
  toggleTable(): void {
    const opening = !this.tableOpen();
    if (opening) {
      this.gridRows.set(EditorToolbarComponent.TABLE_GRID_BASE);
      this.gridCols.set(EditorToolbarComponent.TABLE_GRID_BASE);
      this.tableRows.set(0);
      this.tableCols.set(0);
      // Save the caret before the picker steals focus, so the table lands there.
      this.canvas?.captureMergeSelection();
    }
    this.tableOpen.set(opening);
  }

  /**
   * Highlight rows 1..r / cols 1..c as the pointer moves over the grid. When the
   * pointer reaches the last rendered row/column, grow the grid by one (capped)
   * so larger tables can be picked without a separate dialog — as in CKEditor.
   */
  onTableHover(r: number, c: number): void {
    this.tableRows.set(r);
    this.tableCols.set(c);
    const max = EditorToolbarComponent.TABLE_GRID_MAX;
    if (r === this.gridRows() && r < max) this.gridRows.set(r + 1);
    if (c === this.gridCols() && c < max) this.gridCols.set(c + 1);
  }

  /** Insert an r×c table at the saved caret and close the picker. */
  pickTable(r: number, c: number): void {
    this.canvas?.insertTable(r, c);
    this.tableOpen.set(false);
    this.overflowOpen.set(false);
  }

  applyAlign(command: string): void {
    this.canvas?.execCommand(command);
    this.alignOpen.set(false);
  }

  toggleMergeMenu(): void {
    const opening = !this.menuOpen();
    if (opening) {
      // Remember the caret (body OR subject) before the search input autofocus
      // moves focus away, so the chip inserts at the right place.
      this.canvas?.captureMergeSelection();
    }
    this.menuOpen.set(opening);
    if (opening) {
      this.mergeQuery.set('');
      setTimeout(() => this.mergeSearchRef?.nativeElement.focus());
    }
  }

  onMergeSearch(event: Event): void {
    this.mergeQuery.set((event.target as HTMLInputElement).value);
  }

  pickMergeTag(key: string): void {
    this.canvas?.insertMergeTag(key);
    this.menuOpen.set(false);
    this.overflowOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.menuOpen() && !target.closest('.merge-tag-tool')) {
      this.menuOpen.set(false);
    }
    if (this.overflowOpen() && !target.closest('.overflow-tool')) {
      this.overflowOpen.set(false);
    }
    if (this.alignOpen() && !target.closest('.align-tool')) {
      this.alignOpen.set(false);
    }
    if (this.tableOpen() && !target.closest('.table-tool')) {
      this.tableOpen.set(false);
    }
  }

  /** Run a format command, then refresh the toolbar's active states. */
  format(command: string): void {
    this.canvas?.execCommand(command);
    this.syncFormatState();
  }

  /** Keep the B/I/U/S + list buttons in sync with the current selection. */
  @HostListener('document:selectionchange')
  syncFormatState(): void {
    const el = this.canvas?.canvas;
    const sel = window.getSelection();
    // Only reflect the body selection; leave states as-is when the caret is
    // elsewhere (subject, toolbar inputs, etc.).
    if (!el || !sel || sel.rangeCount === 0) return;
    if (!el.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    try {
      this.boldActive.set(document.queryCommandState('bold'));
      this.italicActive.set(document.queryCommandState('italic'));
      this.underlineActive.set(document.queryCommandState('underline'));
      this.strikeActive.set(document.queryCommandState('strikeThrough'));
      this.ulActive.set(document.queryCommandState('insertUnorderedList'));
      this.olActive.set(document.queryCommandState('insertOrderedList'));
    } catch { /* queryCommandState can throw if focus isn't in an editable */ }
    // No queryCommandState for links — detect by walking up to an <a> from the
    // selection (already confirmed to be inside the body canvas above).
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const anchorEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    this.linkActive.set(!!anchorEl?.closest('a'));
    // Font family/size selects now live in the main strip, so reflect the
    // current selection's font in them live (they used to sync on overflow-open).
    this.syncFontControls();
  }

  onBlockFormat(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.canvas?.execCommandWithValue('formatBlock', value);
  }

  onFontName(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.fontFamily.set(value);
    this.canvas?.applyFontFamily(value);
  }

  onFontSize(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.fontSize.set(value);
    this.canvas?.applyFontSize(value);
  }

  async onImageFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canvas) return;

    const { EditorUtilsService } = await import('../services/editor-utils.service');
    const utils = new EditorUtilsService();

    // Measure dimensions from an object URL — no base64 needed just for the ratio.
    const objectUrl = URL.createObjectURL(file);
    const ratio = await utils.getImageRatio(objectUrl);
    URL.revokeObjectURL(objectUrl);
    const width = Math.min(420, Math.round(520 * ratio));
    const height = Math.round(width / ratio);

    // Encode the file to base64 ONCE here — it's needed both as the upload
    // payload and as the inline fallback src. Upload to the host's image API and
    // use the returned hosted URL as the src so the exported email references a
    // hosted image instead of embedding base64; on failure (or with no uploader)
    // fall back to the inline data URL we already encoded.
    const dataUrl = await utils.readFileAsDataUrl(file);
    let src = dataUrl;
    if (this.uploadImage) {
      try {
        this.state.setStatus('Uploading image…');
        src = await this.uploadImage(dataUrl);
        this.state.setStatus('Image uploaded');
      } catch {
        this.state.setStatus('Image upload failed — using inline copy');
        src = dataUrl;
      }
    }

    this.canvas.insertImageBlock({ src, alt: file.name, width, height, ratio }, true);
    input.value = '';
  }

  async onVideoFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canvas) return;

    const { EditorUtilsService } = await import('../services/editor-utils.service');
    const utils = new EditorUtilsService();

    // Grab a real still frame from the video as its thumbnail/poster. On any
    // failure (codec the browser can't decode, etc.) fall back to the generic
    // play-button placeholder so insertion always works.
    let poster: string;
    let ratio = 16 / 9;
    try {
      this.state.setStatus('Capturing video frame…');
      const frame = await utils.captureVideoPoster(file);
      ratio = frame.ratio;
      poster = frame.poster;
      // Upload the captured frame like images so the exported email references a
      // hosted poster URL instead of a large base64 string; fall back to inline.
      if (this.uploadImage) {
        try {
          this.state.setStatus('Uploading video thumbnail…');
          poster = await this.uploadImage(poster);
          this.state.setStatus('Video thumbnail ready');
        } catch {
          this.state.setStatus('Thumbnail upload failed — using inline frame');
        }
      } else {
        this.state.setStatus('Video frame captured');
      }
    } catch {
      poster = utils.buildVideoPlaceholderSvg(file.name, 1280, 720);
      this.state.setStatus('Could not read video frame — using placeholder');
    }

    const width = 420;
    const height = Math.round(width / ratio);
    this.canvas.insertVideoBlock({
      // Both poster sources carry the play button: captured frames have it baked
      // in by captureVideoPoster, the fallback placeholder SVG draws its own.
      poster, fileName: file.name, alt: file.name, width, height, ratio, overlayBaked: true,
    }, true);
    input.value = '';
  }
}
