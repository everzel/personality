import ToolboxIcon from './svg/toolbox.svg';
import './index.css';
import Uploader from './uploader';

/**
 * Timeout when loader should be removed
 */
const LOADER_DELAY = 500;

/**
 * @typedef {object} PersonalityToolData
 * @description Personality Tool's input and output data format
 * @property {string} name — person's name
 * @property {string} description - person's description
 * @property {string} link - link to person's website
 * @property {Object|null} photo - person's photo data
 */

/**
 * @typedef {object} PersonalityConfig
 * @description Config supported by Tool
 * @property {string} endpoint - image file upload url
 * @property {string} field - field name for uploaded image
 * @property {string} types - available mime-types
 * @property {string} propNamePlaceholder - placeholder for name field
 * @property {string} propValuePlaceholder - placeholder for value field
 */

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on file uploading
 * @property {number} success - 1 for successful uploading, 0 for failure
 * @property {object} file - Object with file data.
 *                           'url' is required,
 *                           also can contain any additional data that will be saved and passed back
 * @property {string} file.url - [Required] image source URL
 */

/**
 * Characteristics Card Tool for the Editor.js
 */
export default class CharacteristicsCard {
  /**
   * @param {PersonalityToolData} data - Tool's data
   * @param {PersonalityConfig} config - Tool's config
   * @param {API} api - Editor.js API
   */
  constructor({ data, config, api }) {
    this.api = api;

    this.nodes = {
      wrapper: null,
      photo: null,
      propRowsWrapper: null,
      propAddButton: null,
      propsContainer: null,
      propRows: []
    };

    this.config = {
      endpoint: config.endpoint || '',
      field: config.field || 'image',
      types: config.types || 'image/*',
      buttonLabel: config.buttonLabel || '+ Add',
      propNamePlaceholder: config.propNamePlaceholder || 'Name',
      propValuePlaceholder: config.propValuePlaceholder || 'Value'
    };

    /**
     * Set saved state
     */
    this.data = data;

    /**
     * Module for image files uploading
     */
    this.uploader = new Uploader({
      config: this.config,
      onUpload: (response) => this.onUpload(response),
      onError: (error) => this.uploadingFailed(error)
    });
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   */
  static get toolbox() {
    return {
      icon: ToolboxIcon,
      title: 'Characteristics Card'
    };
  }

  /**
   * File uploading callback
   * @param {UploadResponseFormat} response
   */
  onUpload(response) {
    const { body: { success, file } } = response;

    if (success && file && file.url) {
      this.data.photo = file;

      this.showFullImage();
    }
  }

  /**
   * On success: remove loader and show full image
   */
  showFullImage() {
    setTimeout(() => {
      this.nodes.photo.classList.remove(this.CSS.loader);
      this.nodes.photo.style.background = `url('${this.data.photo.url}') center center / cover no-repeat`;
    }, LOADER_DELAY);
  }

  /**
   * On fail: remove loader and reveal default image placeholder
   */
  stopLoading() {
    setTimeout(() => {
      this.nodes.photo.classList.remove(this.CSS.loader);
      this.nodes.photo.removeAttribute('style');
    }, LOADER_DELAY);
  }

  /**
   * Show loader when file upload started
   */
  addLoader() {
    this.nodes.photo.style.background = 'none';
    this.nodes.photo.classList.add(this.CSS.loader);
  }

  /**
   * If file uploading failed, remove loader and show notification
   * @param {string} errorMessage -  error message
   */
  uploadingFailed(errorMessage) {
    this.stopLoading();

    this.api.notifier.show({
      message: errorMessage,
      style: 'error'
    });
  }

  /**
   * Tool's CSS classes
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      input: this.api.styles.input,
      loader: this.api.styles.loader,

      /**
       * Tool's classes
       */
      wrapper: 'cdx-characteristics-card',
      photo: 'cdx-characteristics-card__photo',
      propsContainer: 'cdx-characteristics-card__container',
      propRowsWrapper: 'cdx-characteristics-card__rows-wrapper',
      propRow: 'cdx-characteristics-card__prop-row',
      propName: 'cdx-characteristics-card__prop-name',
      propValue: 'cdx-characteristics-card__prop-value',
      propAddButton: 'cdx-characteristics-card__add-button',
      propRemoveButton: 'cdx-characteristics-card__prop-remove-button'
    };
  }

  /**
   * Return Block data
   * @param {HTMLElement} toolsContent
   * @return {PersonalityToolData}
   */
  save(toolsContent) {
    const props = [];
    const photo = this.data.photo || null;

    this.nodes.propRows.forEach(row => {
      const name = row.querySelector(`.${this.CSS.propName}`).textContent || '';
      const value = row.querySelector(`.${this.CSS.propValue}`).textContent || '';

      props.push({ name: name.trim(), value: value.trim() });
    });

    Object.assign(this.data, { props, photo });

    return this.data;
  }

  /**
   * Renders Block content
   * @return {HTMLDivElement}
   */
  render() {
    const { photo, props } = this.data;

    this.nodes.wrapper = this.make('div', this.CSS.wrapper);
    this.nodes.propsContainer = this.make('div', this.CSS.propsContainer);

    this.nodes.propAddButton = this.makePropAddButton();
    const buttonWrapper = this.make('div');

    buttonWrapper.appendChild(this.nodes.propAddButton);

    this.nodes.propRows = [];
    this.nodes.propRowsWrapper = this.make('div', this.CSS.propRowsWrapper);

    (props || []).forEach(prop => {
      this.makePropRow(prop.name, prop.value);
    });

    this.nodes.propsContainer.appendChild(this.nodes.propRowsWrapper);
    this.nodes.propsContainer.appendChild(buttonWrapper);

    this.nodes.photo = this.make('div', this.CSS.photo);

    if (photo) {
      this.nodes.photo.style.background = `url('${photo.url}') center center / cover no-repeat`;
    }

    this.nodes.photo.addEventListener('click', () => {
      this.uploader.uploadSelectedFile({
        onPreview: () => {
          this.addLoader();
        }
      });
    });

    this.nodes.wrapper.appendChild(this.nodes.photo);
    this.nodes.wrapper.appendChild(this.nodes.propsContainer);

    return this.nodes.wrapper;
  }

  /**
   * Validate saved data
   * @param {PersonalityToolData} savedData - tool's data
   * @returns {boolean} - validation result
   */
  validate(savedData) {
    /**
     * Return false if fields are empty
     */
    return true;
  }

  /**
   * Helper method for elements creation
   * @param tagName
   * @param classNames
   * @param attributes
   * @return {HTMLElement}
   */
  make(tagName, classNames = null, attributes = {}) {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }

    return el;
  }

  /**
   * @return {HTMLElement}
   */
  makePropAddButton() {
    const button = this.make('button', this.CSS.propAddButton);

    button.innerText = this.config.buttonLabel;

    button.addEventListener('click', () => {
      this.makePropRow();
    });

    return button;
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  makePropRow(name = '', value = '') {
    const propRow = this.make('div', this.CSS.propRow);

    propRow.dataset.index = String(this.nodes.propRows.length);

    const nameEl = this.make('div', this.CSS.propName, {
      contentEditable: true
    });

    if (name) {
      nameEl.textContent = name;
    } else {
      nameEl.dataset.placeholder = this.config.propNamePlaceholder;
    }

    const valueEl = this.make('div', this.CSS.propValue, {
      contentEditable: true
    });

    if (value) {
      valueEl.textContent = value;
    } else {
      valueEl.dataset.placeholder = this.config.propValuePlaceholder;
    }

    const removeButton = this.make('button', this.CSS.propRemoveButton);

    removeButton.innerHTML = '&#10005;';

    removeButton.addEventListener('click', (e) => {
      this.onRemovePropRow(
        Number(e.target.parentNode.dataset.index)
      );
    });

    propRow.appendChild(nameEl);
    propRow.appendChild(valueEl);
    propRow.appendChild(removeButton);

    this.nodes.propRows.push(propRow);
    this.nodes.propRowsWrapper.appendChild(propRow);
  }

  /**
   * @param {number} index
   */
  onRemovePropRow(index) {
    const node = this.nodes.propRows[index];

    // remove node from list and reindex
    this.nodes.propRows = this.nodes.propRows
      .filter((_, idx) => idx !== index)
      .map((n, idx) => {
        n.dataset.index = idx;
        return n;
      });

    node.remove();
  }
}
