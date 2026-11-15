package com.family.nutritionist;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * WebView 长按策略：
 * - 静态文字：消费长按，不弹「复制 / 分享 / 全选 / 朗读」这类网页式菜单，保持原生观感。
 * - 输入框 / 文本域：放行长按，让系统弹出「粘贴 / 全选」，否则用户只能一个字一个字敲密钥。
 *
 * 用 HitTestResult 区分命中的是不是可编辑区域，不能用「一律返回 true」的简单做法。
 * Web 层另有 CSS + JS 兜底（src/index.css、src/lib/nativeUi.ts）。
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setHapticFeedbackEnabled(false);
            webView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    WebView.HitTestResult hit = webView.getHitTestResult();
                    // 命中输入框时返回 false：交回系统默认处理，粘贴菜单才会出现
                    if (hit != null && hit.getType() == WebView.HitTestResult.EDIT_TEXT_TYPE) {
                        return false;
                    }
                    // 其余（静态文字、图片等）消费掉，不弹选择菜单
                    return true;
                }
            });
        }
    }
}
