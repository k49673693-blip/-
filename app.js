
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
    
    // HTML特殊文字のエスケープ
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // http(s):// または www. から始まるURLを自動検出してリンク化
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
  addIngredientBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addIngredientRow();
  });

  addStepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addStepRow();
  });

  // 画像ファイル読込
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

  removeImageBtn.addEventListener('click', () => {
    currentImageData = '';
    imageFileInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  });

  // レシピ保存処理
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

  function resetForm() {
    recipeIdInput.value = '';
    titleInput.value = '';
    categoryInput.value = '';
    ingredientsList.innerHTML = '';
    stepsList.innerHTML = '';
    currentImageData = '';
    imageFileInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    memoInput.value = '';

    document.getElementById('form-title').textContent = '新規レシピ追加';
    submitBtn.textContent = 'レシピを保存';
    cancelBtn.style.display = 'none';

    addIngredientRow();
    addStepRow();
  }

  cancelBtn.addEventListener('click', resetForm);

  // 食材絞り込みタグの追加・描画
  function addIngredientFilterTag() {
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

  addIngredientFilterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addIngredientFilterTag();
  });

  ingredientSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredientFilterTag();
    }
  });

  // 一覧描画 & 絞り込み実行
  function renderRecipes() {
    recipeListContainer.innerHTML = '';

    const keyword = searchKeyword.value.toLowerCase();
    const selectedCategory = filterCategory.value;

    const filtered = recipes.filter(r => {
      const matchesKeyword = r.title.toLowerCase().includes(keyword);
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
      recipeListContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777; padding: 20px;">条件に当てはまるレシピが見つかりません</p>';
      return;
    }

    filtered.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';

      const imgSrc = recipe.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23eeeeee"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="20" fill="%23aaa">No Image</text></svg>';

      card.innerHTML = `
        <img src="${imgSrc}" class="card-img" alt="${recipe.title}">
        <div class="card-content">
          <span class="badge">${recipe.category}</span>
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

  // 編集ロード
  function loadRecipeToForm(recipe) {
    recipeIdInput.value = recipe.id || '';
    titleInput.value = recipe.title || '';
    categoryInput.value = recipe.category || '主菜';
    memoInput.value = recipe.memo || '';

    ingredientsList.innerHTML = '';
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

    stepsList.innerHTML = '';
    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps.forEach(s => addStepRow(s));
    } else {
      addStepRow();
    }

    currentImageData = recipe.image || '';
    if (currentImageData) {
      imagePreview.src = currentImageData;
      imagePreviewContainer.style.display = 'flex';
    } else {
      imagePreview.src = '';
      imagePreviewContainer.style.display = 'none';
    }

    document.getElementById('form-title').textContent = 'レシピを編集';
    submitBtn.textContent = '変更を更新';
    cancelBtn.style.display = 'inline-block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  searchKeyword.addEventListener('input', renderRecipes);
  filterCategory.addEventListener('change', renderRecipes);

  // モーダル表示制御
  function openModal(recipe) {
    modalTitle.textContent = recipe.title;
    modalCategory.textContent = recipe.category;

    if (recipe.image) {
      modalImage.src = recipe.image;
      modalImage.style.display = 'block';
    } else {
      modalImage.removeAttribute('src');
      modalImage.style.display = 'none';
    }

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

    modalSteps.innerHTML = '';
    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        modalSteps.appendChild(li);
      });
    }

    if (recipe.memo) {
      modalMemo.innerHTML = formatMemoText(recipe.memo);
      modalMemoContainer.style.display = 'block';

      const links = modalMemo.querySelectorAll('.memo-link');
      links.forEach(link => {
        const stopProp = (e) => e.stopPropagation();
        link.addEventListener('click', stopProp);
        link.addEventListener('touchend', stopProp);
      });
    } else {
      modalMemoContainer.style.display = 'none';
    }

    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    recipeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  modalClose.addEventListener('click', closeModal);

  recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
      closeModal();
    }
  });

  resetForm();
  renderRecipes();

    // -------------------------------------------------------------
  // 外部サイトから「タイトル・材料・画像・URL」を取り込む処理
  // -------------------------------------------------------------
  function checkExternalImport() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#import=')) {
      try {
        const rawData = decodeURIComponent(hash.substring(8));
        const importedData = JSON.parse(rawData);

        if (importedData) {
          loadRecipeToForm({
            title: importedData.title || '',
            category: '主菜',
            ingredients: importedData.ingredients || [],
            steps: [], // 手順は取り込まない
            image: importedData.image || '',
            memo: importedData.url ? `参照元URL: ${importedData.url}` : ''
          });

          // 画像がURL形式で渡された場合プレビューを表示
          if (importedData.image) {
            currentImageData = importedData.image;
            imagePreview.src = importedData.image;
            imagePreviewContainer.style.display = 'flex';
          }

          history.replaceState(null, null, ' ');
          alert('タイトル、材料、画像、参照URLを取り込みました！');
        }
      } catch (err) {
        console.error('Import error:', err);
      }
    }
  }
