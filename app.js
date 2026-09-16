document.addEventListener('DOMContentLoaded', () => {
  // PWA (Service Worker) 登録処理
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.log('SW registration failed: ', err);
    });
  }

  let recipes = [];
  try {
    recipes = JSON.parse(localStorage.getItem('recipes')) || [];
  } catch (e) {
    recipes = [];
  }

  let currentImageData = '';
  let searchIngredientTags = [];

  // DOM要素取得
  const recipeForm = document.getElementById('recipe-form');
  const recipeIdInput = document.getElementById('recipe-id');
  const titleInput = document.getElementById('title');
  const categoryInput = document.getElementById('category');
  const ingredientsList = document.getElementById('ingredients-list');
  const stepsList = document.getElementById('steps-list');
  const addIngredientBtn = document.getElementById('add-ingredient-btn');
  const addStepBtn = document.getElementById('add-step-btn');

  const imageFileInput = document.getElementById('image-file');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const memoInput = document.getElementById('memo');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  const recipeListContainer = document.getElementById('recipe-list');
  const searchKeyword = document.getElementById('search-keyword');
  const filterCategory = document.getElementById('filter-category');

  // 食材検索用DOM
  const ingredientSearchInput = document.getElementById('ingredient-search-input');
  const addIngredientFilterBtn = document.getElementById('add-ingredient-filter-btn');
  const ingredientTagsContainer = document.getElementById('ingredient-tags');

  // モーダル要素
  const recipeModal = document.getElementById('recipe-modal');
  const modalClose = document.getElementById('modal-close');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalIngredients = document.getElementById('modal-ingredients');
  const modalSteps = document.getElementById('modal-steps');
  const modalMemo = document.getElementById('modal-memo');
  const modalMemoContainer = document.getElementById('modal-memo-container');

  /**
   * テキスト内のURLを強力かつ柔軟にリンクタグ(<a>)に自動変換する関数
   */
  function formatMemoText(text) {
    if (!text) return '';
    
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const fullUrlRegex = /(https?:\/\/[a-zA-Z0-9.\-_~:/?#[\]@!$&'()*+,;=%]+)/g;
    const wwwUrlRegex = /(^|[^\w/])(www\.[a-zA-Z0-9.\-_~:/?#[\]@!$&'()*+,;=%]+)/g;

    let result = escaped;

    result = result.replace(fullUrlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="memo-link">${url}</a>`;
    });

    result = result.replace(wwwUrlRegex, (match, prefix, url) => {
      return `${prefix}<a href="http://${url}" target="_blank" rel="noopener noreferrer" class="memo-link">${url}</a>`;
    });

    return result;
  }

  // 食材行追加
  function addIngredientRow(name = '', amount = '') {
    if (!ingredientsList) return;
    const div = document.createElement('div');
    div.className = 'dynamic-row ingredient-row';
    div.innerHTML = `
      <input type="text" class="ingredient-name-input" placeholder="食材名 (例: 強力粉)" value="${name}">
      <input type="text" class="ingredient-amount-input" placeholder="分量 (例: 200g)" value="${amount}">
      <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
    `;
    div.querySelector('.remove-row-btn').addEventListener('click', () => {
      div.remove();
    });
    ingredientsList.appendChild(div);
  }

  // 手順番号更新
  function updateStepNumbers() {
    if (!stepsList) return;
    const stepRows = stepsList.querySelectorAll('.step-row');
    stepRows.forEach((row, index) => {
      const numSpan = row.querySelector('.step-number');
      if (numSpan) {
        numSpan.textContent = `手順${index + 1}:`;
      }
    });
  }

  // 作り方行追加
  function addStepRow(value = '') {
    if (!stepsList) return;
    const div = document.createElement('div');
    div.className = 'dynamic-row step-row';
    div.innerHTML = `
      <span class="step-number"></span>
      <input type="text" class="step-input" placeholder="手順を入力してください" value="${value}">
      <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
    `;
    div.querySelector('.remove-row-btn').addEventListener('click', () => {
      div.remove();
      updateStepNumbers();
    });
    stepsList.appendChild(div);
    updateStepNumbers();
  }

  // ボタンイベント登録
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addIngredientRow();
    });
  }

  if (addStepBtn) {
    addStepBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addStepRow();
    });
  }

  // 画像ファイル読込
  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          currentImageData = event.target.result;
          imagePreview.src = currentImageData;
          imagePreviewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      currentImageData = '';
      if (imageFileInput) imageFileInput.value = '';
      if (imagePreview) imagePreview.src = '';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    });
  }

  // レシピ保存処理
  if (recipeForm) {
    recipeForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const id = recipeIdInput.value || Date.now().toString();
      const title = titleInput.value.trim();
      const category = categoryInput.value;

      const ingredientRows = ingredientsList.querySelectorAll('.ingredient-row');
      const ingredients = [];
      ingredientRows.forEach(row => {
        const name = row.querySelector('.ingredient-name-input').value.trim();
        const amount = row.querySelector('.ingredient-amount-input').value.trim();
        if (name !== '' || amount !== '') {
          ingredients.push({ name, amount });
        }
      });

      const steps = Array.from(document.querySelectorAll('.step-input'))
        .map(input => input.value.trim())
        .filter(val => val !== '');

      const memo = memoInput.value.trim();

      const recipeData = {
        id,
        title,
        category,
        ingredients,
        steps,
        image: currentImageData,
        memo
      };

      const existingIndex = recipes.findIndex(r => r.id === id);
      if (existingIndex > -1) {
        recipes[existingIndex] = recipeData;
      } else {
        recipes.push(recipeData);
      }

      try {
        localStorage.setItem('recipes', JSON.stringify(recipes));
      } catch (err) {
        alert('画像サイズが大きすぎます。小さめの画像を選択してください。');
        return;
      }

      resetForm();
      renderRecipes();
    });
  }

  function resetForm() {
    if (recipeIdInput) recipeIdInput.value = '';
    if (titleInput) titleInput.value = '';
    if (categoryInput) categoryInput.value = '主菜';
    if (ingredientsList) ingredientsList.innerHTML = '';
    if (stepsList) stepsList.innerHTML = '';
    currentImageData = '';
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (memoInput) memoInput.value = '';

    const formTitle = document.getElementById('form-title-text');
    if (formTitle) formTitle.textContent = '新規レシピ追加';
    if (submitBtn) submitBtn.textContent = 'レシピを保存';
    if (cancelBtn) cancelBtn.style.display = 'none';

    addIngredientRow();
    addStepRow();
  }

  if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

  // 食材絞り込みタグ
  function addIngredientFilterTag() {
    if (!ingredientSearchInput) return;
    const val = ingredientSearchInput.value.trim();
    if (val !== '') {
      if (!searchIngredientTags.includes(val)) {
        searchIngredientTags.push(val);
        renderIngredientTags();
        renderRecipes();
      }
      ingredientSearchInput.value = '';
    }
  }

  function renderIngredientTags() {
    if (!ingredientTagsContainer) return;
    ingredientTagsContainer.innerHTML = '';
    searchIngredientTags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'ingredient-tag';
      tagEl.innerHTML = `
        <span>${tag}</span>
        <span class="remove-tag" title="削除">&times;</span>
      `;
      tagEl.querySelector('.remove-tag').addEventListener('click', () => {
        searchIngredientTags = searchIngredientTags.filter(t => t !== tag);
        renderIngredientTags();
        renderRecipes();
      });
      ingredientTagsContainer.appendChild(tagEl);
    });
  }

  if (addIngredientFilterBtn) {
    addIngredientFilterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addIngredientFilterTag();
    });
  }

  if (ingredientSearchInput) {
    ingredientSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIngredientFilterTag();
      }
    });
  }

  // 一覧描画
  function renderRecipes() {
    if (!recipeListContainer) return;
    recipeListContainer.innerHTML = '';

    const keyword = searchKeyword ? searchKeyword.value.toLowerCase() : '';
    const selectedCategory = filterCategory ? filterCategory.value : 'all';

    const filtered = recipes.filter(r => {
      const matchesKeyword = r.title ? r.title.toLowerCase().includes(keyword) : false;
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;

      const matchesIngredients = searchIngredientTags.every(tag => {
        const tagLower = tag.toLowerCase();
        if (!r.ingredients) return false;
        return r.ingredients.some(ing => {
          if (typeof ing === 'string') {
            return ing.toLowerCase().includes(tagLower);
          } else if (ing && ing.name) {
            return ing.name.toLowerCase().includes(tagLower);
          }
          return false;
        });
      });

      return matchesKeyword && matchesCategory && matchesIngredients;
    });

    if (filtered.length === 0) {
      recipeListContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777; padding: 20px;">登録されたレシピはありません</p>';
      return;
    }

    filtered.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';

      const imgSrc = recipe.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23eeeeee"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="20" fill="%23aaa">No Image</text></svg>';

      card.innerHTML = `
        <img src="${imgSrc}" class="card-img" alt="${recipe.title}">
        <div class="card-content">
          <span class="badge">${recipe.category || '未設定'}</span>
          <div class="card-title">${recipe.title}</div>
          <div class="card-actions">
            <button type="button" class="btn-edit">編集</button>
            <button type="button" class="btn-delete">削除</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-delete')) {
          return;
        }
        openModal(recipe);
      });

      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        loadRecipeToForm(recipe);
      });

      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`「${recipe.title}」を削除してもよろしいですか？`)) {
          recipes = recipes.filter(r => r.id !== recipe.id);
          localStorage.setItem('recipes', JSON.stringify(recipes));
          renderRecipes();
        }
      });

      recipeListContainer.appendChild(card);
    });
  }

  // 編集データのフォーム読み込み
  function loadRecipeToForm(recipe) {
    if (recipeIdInput) recipeIdInput.value = recipe.id || '';
    if (titleInput) titleInput.value = recipe.title || '';
    if (categoryInput) categoryInput.value = recipe.category || '主菜';
    if (memoInput) memoInput.value = recipe.memo || '';

    if (ingredientsList) ingredientsList.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(i => {
        if (typeof i === 'string') {
          addIngredientRow(i, '');
        } else {
          addIngredientRow(i.name || '', i.amount || '');
        }
      });
    } else {
      addIngredientRow();
    }

    if (stepsList) stepsList.innerHTML = '';
    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps.forEach(s => addStepRow(s));
    } else {
      addStepRow();
    }

    currentImageData = recipe.image || '';
    if (currentImageData && imagePreview && imagePreviewContainer) {
      imagePreview.src = currentImageData;
      imagePreviewContainer.style.display = 'flex';
    } else if (imagePreviewContainer) {
      imagePreviewContainer.style.display = 'none';
    }

    const formTitle = document.getElementById('form-title-text');
    if (formTitle) formTitle.textContent = 'レシピを編集';
    if (submitBtn) submitBtn.textContent = '変更を更新';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (searchKeyword) searchKeyword.addEventListener('input', renderRecipes);
  if (filterCategory) filterCategory.addEventListener('change', renderRecipes);

  // モーダル処理
  function openModal(recipe) {
    if (!recipeModal) return;
    if (modalTitle) modalTitle.textContent = recipe.title;
    if (modalCategory) modalCategory.textContent = recipe.category || '未設定';

    if (recipe.image && modalImage) {
      modalImage.src = recipe.image;
      modalImage.style.display = 'block';
    } else if (modalImage) {
      modalImage.removeAttribute('src');
      modalImage.style.display = 'none';
    }

    if (modalIngredients) {
      modalIngredients.innerHTML = '';
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => {
          const li = document.createElement('li');
          if (typeof ing === 'string') {
            li.innerHTML = `<span class="ing-name">${ing}</span><span class="ing-amount"></span>`;
          } else {
            li.innerHTML = `
              <span class="ing-name">${ing.name || ''}</span>
              <span class="ing-amount">${ing.amount || ''}</span>
            `;
          }
          modalIngredients.appendChild(li);
        });
      }
    }

    if (modalSteps) {
      modalSteps.innerHTML = '';
      if (recipe.steps && recipe.steps.length > 0) {
        recipe.steps.forEach(step => {
          const li = document.createElement('li');
          li.textContent = step;
          modalSteps.appendChild(li);
        });
      }
    }

    if (recipe.memo && modalMemo && modalMemoContainer) {
      modalMemo.innerHTML = formatMemoText(recipe.memo);
      modalMemoContainer.style.display = 'block';

      const links = modalMemo.querySelectorAll('.memo-link');
      links.forEach(link => {
        const stopProp = (e) => e.stopPropagation();
        link.addEventListener('click', stopProp);
        link.addEventListener('touchend', stopProp);
      });
    } else if (modalMemoContainer) {
      modalMemoContainer.style.display = 'none';
    }

    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (recipeModal) recipeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (recipeModal) {
    recipeModal.addEventListener('click', (e) => {
      if (e.target === recipeModal) closeModal();
    });
  }

  // -------------------------------------------------------------
  // クリップボードURLからの自動解析・取り込み機能
  // -------------------------------------------------------------
  async function importFromClipboardUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || (!text.startsWith('http://') && !text.startsWith('https://'))) {
        alert('クリップボードにレシピページのURLが見つかりませんでした。WebサイトでURLをコピーしてから押してください。');
        return;
      }

      const targetUrl = text.trim();
      alert('URLを検出しました。レシピデータを読み込んでいます...');

      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);
      const res = await fetch(proxyUrl);
      const data = await res.json();
      
      if (!data.contents) {
        throw new Error('ページの取得に失敗しました');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');

      let importedData = {
        title: '',
        ingredients: [],
        imageUrl: '',
        url: targetUrl
      };

      // 1. cotta.jp 解析
      if (targetUrl.includes('cotta.jp')) {
        importedData.title = doc.querySelector('.recipe_header_ttl, h1')?.innerText.trim() || doc.title;
        const img = doc.querySelector('.recipe_main_img img, .main_img img, #recipe_main_image img');
        if (img) importedData.imageUrl = img.src;

        doc.querySelectorAll('.recipe_ingredients_table tr, .ingredient_table tr').forEach(r => {
          const name = r.querySelector('.ingredient_name, .name, td:first-child')?.innerText.trim();
          const amount = r.querySelector('.ingredient_amount, .amount, td:last-child')?.innerText.trim();
          if (name && name !== '材料') {
            importedData.ingredients.push({ name, amount: amount || '' });
          }
        });
      }
      
      // 2. cookpad.com 解析
      if (importedData.ingredients.length === 0 && targetUrl.includes('cookpad.com')) {
        importedData.title = doc.querySelector('h1.recipe-title, h1')?.innerText.trim() || doc.title;
        const img = doc.querySelector('#main_photo img, .recipe-main-photo img');
        if (img) importedData.imageUrl = img.src;

        const names = doc.querySelectorAll('.ingredient_name');
        const amounts = doc.querySelectorAll('.ingredient_quantity');
        names.forEach((n, i) => {
          if (n.innerText) {
            importedData.ingredients.push({
              name: n.innerText.trim(),
              amount: amounts[i] ? amounts[i].innerText.trim() : ''
            });
          }
        });
      }

      // 3. 共通規格 (JSON-LD) 解析 (汎用フォールバック)
      if (importedData.ingredients.length === 0) {
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
          try {
            let json = JSON.parse(s.innerText);
            if (Array.isArray(json)) json = json.find(x => x && x['@type'] === 'Recipe');
            if (json && (json['@type'] === 'Recipe' || (Array.isArray(json['@type']) && json['@type'].includes('Recipe')))) {
              if (!importedData.title) importedData.title = json.name || doc.title;
              if (json.image) {
                importedData.imageUrl = Array.isArray(json.image) ? json.image[0] : (json.image.url || json.image);
              }
              if (json.recipeIngredient) {
                importedData.ingredients = json.recipeIngredient.map(i => {
                  const p = i.trim().split(/\s+/);
                  return { name: p[0] || i, amount: p.slice(1).join(' ') || '' };
                });
              }
            }
          } catch (e) {}
        });
      }

      if (!importedData.title) importedData.title = doc.title;

      // フォームへ読み込み（手順は空）
      loadRecipeToForm({
        title: importedData.title || '',
        category: '主菜',
        ingredients: importedData.ingredients || [],
        steps: [],
        image: '',
        memo: `参照元URL: ${targetUrl}`
      });

      if (importedData.imageUrl) {
        currentImageData = importedData.imageUrl;
        if (imagePreview) imagePreview.src = importedData.imageUrl;
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
      }

      alert('タイトル、材料、画像を自動取り込みしました！確認して保存してください。');
    } catch (err) {
      alert('自動読み込みに失敗しました。URLが正しいかご確認ください。');
      console.error(err);
    }
  }

  // 「取り込む」ボタンをフォーム上部に設置
  const formTitleEl = document.getElementById('form-title');
  if (formTitleEl && !document.getElementById('clip-import-btn')) {
    const importBtn = document.createElement('button');
    importBtn.id = 'clip-import-btn';
    importBtn.type = 'button';
    importBtn.textContent = '📋 URLから自動取り込み';
    importBtn.style.cssText = 'margin-left: 12px; padding: 6px 12px; font-size: 13px; background: #ff9800; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
    importBtn.addEventListener('click', importFromClipboardUrl);
    formTitleEl.appendChild(importBtn);
  }

  resetForm();
  renderRecipes();
});
