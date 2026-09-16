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
  const yieldInput = document.getElementById('yield');
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

  // -------------------------------------------------------------
  // 「+ レシピを追加」ボタンの設置とフォーム開閉制御
  // -------------------------------------------------------------
  let toggleFormBtn = document.getElementById('toggle-form-btn');

  if (!toggleFormBtn && recipeForm) {
    toggleFormBtn = document.createElement('button');
    toggleFormBtn.id = 'toggle-form-btn';
    toggleFormBtn.type = 'button';
    toggleFormBtn.textContent = '＋ レシピを追加';
    toggleFormBtn.style.cssText = 'width: 100%; padding: 12px; margin-bottom: 16px; font-size: 16px; font-weight: bold; background-color: #ff9800; color: #fff; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.15);';
    
    recipeForm.parentNode.insertBefore(toggleFormBtn, recipeForm);
    recipeForm.style.display = 'none';

    toggleFormBtn.addEventListener('click', () => {
      if (recipeForm.style.display === 'none') {
        showForm();
      } else {
        hideForm();
      }
    });
  } else if (recipeForm) {
    recipeForm.style.display = 'none';
  }

  function showForm() {
    if (recipeForm) {
      recipeForm.style.display = 'block';
      if (toggleFormBtn) {
        toggleFormBtn.textContent = '✕ フォームを閉じる';
        toggleFormBtn.style.backgroundColor = '#757575';
      }
    }
  }

  function hideForm() {
    if (recipeForm) {
      recipeForm.style.display = 'none';
      if (toggleFormBtn) {
        toggleFormBtn.textContent = '＋ レシピを追加';
        toggleFormBtn.style.backgroundColor = '#ff9800';
      }
    }
  }

  // 安全な画像圧縮処理 (タイムアウト制御付き)
  function compressImage(srcUrl, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      if (!srcUrl) return resolve('');

      const timeout = setTimeout(() => {
        resolve(srcUrl); // 処理が重い/固まった場合は元のURLをそのまま返して続行
      }, 1500);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        clearTimeout(timeout);
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        } catch (e) {
          resolve(srcUrl);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(srcUrl);
      };
      img.src = srcUrl;
    });
  }

  // バックアップ UI設置
  function setupBackupUI() {
    const mainContainer = document.querySelector('.container') || document.body;
    if (!mainContainer || document.getElementById('backup-container')) return;

    const backupDiv = document.createElement('div');
    backupDiv.id = 'backup-container';
    backupDiv.style.cssText = 'margin: 15px 0; padding: 12px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;';

    backupDiv.innerHTML = `
      <span style="font-size: 13px; font-weight: bold; color: #2e7d32;">💾 データ管理・バックアップ</span>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" id="export-json-btn" style="padding: 6px 12px; font-size: 12px; background: #4caf50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">データ出力(保存)</button>
        <button type="button" id="import-json-btn" style="padding: 6px 12px; font-size: 12px; background: #2196f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">データ読み込み(復元)</button>
        <input type="file" id="import-json-file" accept=".json" style="display: none;">
      </div>
    `;

    const searchSection = document.querySelector('.search-container') || recipeListContainer;
    if (searchSection) {
      searchSection.parentNode.insertBefore(backupDiv, searchSection);
    } else {
      mainContainer.insertBefore(backupDiv, mainContainer.firstChild);
    }

    document.getElementById('export-json-btn').addEventListener('click', () => {
      if (recipes.length === 0) {
        alert('保存するレシピデータがありません。');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipes, null, 2));
      const downloadAnchor = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `recipe_backup_${today}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    const importFileInput = document.getElementById('import-json-file');
    document.getElementById('import-json-btn').addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const importedRecipes = JSON.parse(evt.target.result);
          if (Array.isArray(importedRecipes)) {
            if (confirm(`ファイルから ${importedRecipes.length} 件のレシピを復元しますか？（現在のデータは上書き・統合されます）`)) {
              importedRecipes.forEach(imported => {
                const idx = recipes.findIndex(r => r.id === imported.id);
                if (idx > -1) recipes[idx] = imported;
                else recipes.push(imported);
              });
              localStorage.setItem('recipes', JSON.stringify(recipes));
              renderRecipes();
              alert('データの復元が完了しました！');
            }
          } else {
            alert('無効なファイルフォーマットです。');
          }
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。');
          console.error(err);
        }
      };
      reader.readAsText(file);
      importFileInput.value = '';
    });
  }

  setupBackupUI();

  // URL自動リンク化
  function formatMemoText(text) {
    if (!text) return '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const fullUrlRegex = /(https?:\/\/[a-zA-Z0-9.\-_~:/?#[\]@!$&'()*+,;=%]+)/g;
    return escaped.replace(fullUrlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="memo-link">${url}</a>`;
    });
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
    div.querySelector('.remove-row-btn').addEventListener('click', () => div.remove());
    ingredientsList.appendChild(div);
  }

  // 手順番号更新
  function updateStepNumbers() {
    if (!stepsList) return;
    const stepRows = stepsList.querySelectorAll('.step-row');
    stepRows.forEach((row, index) => {
      const numSpan = row.querySelector('.step-number');
      if (numSpan) numSpan.textContent = `手順${index + 1}:`;
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

  // ファイル読み込み時・自動圧縮処理
  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
          currentImageData = await compressImage(event.target.result);
          if (imagePreview) imagePreview.src = currentImageData;
          if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
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

  // 保存処理
  if (recipeForm) {
    recipeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = recipeIdInput.value || Date.now().toString();
      const title = titleInput.value.trim();
      const yieldVal = yieldInput ? yieldInput.value.trim() : '';
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

      let finalImg = currentImageData;
      if (finalImg && finalImg.startsWith('data:image')) {
        finalImg = await compressImage(finalImg);
      }

      const recipeData = {
        id,
        title,
        recipeYield: yieldVal,
        category,
        ingredients,
        steps,
        image: finalImg,
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
        alert('保存領域の限界を超えました。不要なレシピを削除するか軽量な画像をお試しください。');
        return;
      }

      resetForm();
      hideForm();
      renderRecipes();
    });
  }

  function resetForm() {
    if (recipeIdInput) recipeIdInput.value = '';
    if (titleInput) titleInput.value = '';
    if (yieldInput) yieldInput.value = '';
    if (categoryInput) categoryInput.value = '';
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

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetForm();
      hideForm();
    });
  }

  // 食材タグ描画
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

  function addIngredientFilterTag() {
    if (!ingredientSearchInput) return;
    const val = ingredientSearchInput.value.trim();
    if (val !== '' && !searchIngredientTags.includes(val)) {
      searchIngredientTags.push(val);
      renderIngredientTags();
      renderRecipes();
      ingredientSearchInput.value = '';
    }
  }

  if (addIngredientFilterBtn) addIngredientFilterBtn.addEventListener('click', addIngredientFilterTag);

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
          if (typeof ing === 'string') return ing.toLowerCase().includes(tagLower);
          if (ing && ing.name) return ing.name.toLowerCase().includes(tagLower);
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

      const yieldBadge = recipe.recipeYield ? `<span class="badge" style="background:#8bc34a; margin-left:4px;">${recipe.recipeYield}</span>` : '';

      card.innerHTML = `
        <img src="${imgSrc}" class="card-img" alt="${recipe.title}">
        <div class="card-content">
          <span class="badge">${recipe.category || '未設定'}</span>${yieldBadge}
          <div class="card-title">${recipe.title}</div>
          <div class="card-actions">
            <button type="button" class="btn-edit">編集</button>
            <button type="button" class="btn-delete">削除</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-delete')) return;
        openModal(recipe);
      });

      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        loadRecipeToForm(recipe);
        showForm();
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


  // フォーム読み込み
  function loadRecipeToForm(recipe) {
    if (recipeIdInput) recipeIdInput.value = recipe.id || '';
    if (titleInput) titleInput.value = recipe.title || '';
    if (yieldInput) yieldInput.value = recipe.recipeYield || '';
    if (categoryInput) categoryInput.value = recipe.category || '';
    if (memoInput) memoInput.value = recipe.memo || '';

    if (ingredientsList) ingredientsList.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(i => {
        if (typeof i === 'string') addIngredientRow(i, '');
        else addIngredientRow(i.name || '', i.amount || '');
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
    if (modalTitle) modalTitle.textContent = recipe.title || '';
    if (modalCategory) {
      modalCategory.textContent = recipe.recipeYield ? `${recipe.category || '未設定'} (${recipe.recipeYield})` : (recipe.category || '未設定');
    }

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
            li.innerHTML = `<span class="ing-name">${ing.name || ''}</span><span class="ing-amount">${ing.amount || ''}</span>`;
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
    } else if (modalMemoContainer) {
      modalMemoContainer.style.display = 'none';
    }

    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  if (modalClose) modalClose.addEventListener('click', () => {
    recipeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  // モーダルの背景クリックで閉じる機能を追加
  window.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
      recipeModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });

  // -------------------------------------------------------------
  // 外部(ブックマークレット)からのデータ受信用処理
  // -------------------------------------------------------------
  async function checkExternalImport() {
    const params = new URLSearchParams(window.location.search);
    const rawData = params.get('import_data');

    if (rawData) {
      try {
        const data = JSON.parse(decodeURIComponent(rawData));
        
        loadRecipeToForm({
          title: data.title || '',
          recipeYield: data.recipeYield || '',
          category: '',
          ingredients: (data.ingredients && data.ingredients.length > 0) ? data.ingredients : [],
          steps: [],
          image: '',
          memo: data.url ? `参照元URL: ${data.url}` : ''
        });

        if (data.imageUrl) {
          currentImageData = await compressImage(data.imageUrl);
          if (imagePreview) imagePreview.src = currentImageData;
          if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
        }

        showForm();

        window.history.replaceState({}, document.title, window.location.pathname);
// フォーム読み込み
  function loadRecipeToForm(recipe) {
    if (recipeIdInput) recipeIdInput.value = recipe.id || '';
    if (titleInput) titleInput.value = recipe.title || '';
    const yEl = document.getElementById('yield');
    if (yEl) yEl.value = recipe.recipeYield || '';
    if (categoryInput) categoryInput.value = recipe.category || '';
    if (memoInput) memoInput.value = recipe.memo || '';

    if (ingredientsList) ingredientsList.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(i => {
        if (typeof i === 'string') addIngredientRow(i, '');
        else addIngredientRow(i.name || '', i.amount || '');
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
    if (modalCategory) {
      modalCategory.textContent = recipe.recipeYield ? `${recipe.category || '未設定'} (${recipe.recipeYield})` : (recipe.category || '未設定');
    }

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
            li.innerHTML = `<span class="ing-name">${ing.name || ''}</span><span class="ing-amount">${ing.amount || ''}</span>`;
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
    } else if (modalMemoContainer) {
      modalMemoContainer.style.display = 'none';
    }

    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  if (modalClose) modalClose.addEventListener('click', () => {
    recipeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  // -------------------------------------------------------------
  // 外部(ブックマークレット)からのデータ受信用処理
  // -------------------------------------------------------------
  async function checkExternalImport() {
    const params = new URLSearchParams(window.location.search);
    const rawData = params.get('import_data');

    if (rawData) {
      try {
        const data = JSON.parse(decodeURIComponent(rawData));
        
        loadRecipeToForm({
          title: data.title || '',
          recipeYield: data.recipeYield || '',
          category: '',
          ingredients: (data.ingredients && data.ingredients.length > 0) ? data.ingredients : [],
          steps: [],
          image: '',
          memo: data.url ? `参照元URL: ${data.url}` : ''
        });

        if (data.imageUrl) {
          // 取り込み画像の自動圧縮
          currentImageData = await compressImage(data.imageUrl);
          if (imagePreview) imagePreview.src = currentImageData;
          if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
        }

        showForm();

        window.history.replaceState({}, document.title, window.location.pathname);
        alert('レシピ情報を自動入力しました！');
      } catch (e) {
        console.error('取り込み失敗:', e);
      }
    }
  }

  resetForm();
  renderRecipes();
  checkExternalImport();
});
