/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2023, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

/*
This test suite is dedicated to tests which verify Open MCT's Notification functionality
*/

const { createDomainObjectWithDefaults, createNotification } = require('../../appActions');
const { test, expect } = require('../../pluginFixtures');

test.describe('Notifications List', () => {
  test('Notifications can be dismissed individually', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/nasa/openmct/issues/6122'
    });

    // Go to baseURL
    await page.goto('./', { waitUntil: 'domcontentloaded' });

    // Create an error notification with the message "Error message"
    await createNotification(page, {
      severity: 'error',
      message: 'Error message'
    });

    // Wait for notification indicator to be visible and show count of 1
    await expect(
      page.locator('button[aria-label*="Review"][aria-label*="Notifications"]')
    ).toBeVisible();
    await expect(page.locator('button[aria-label="Review 1 Notification"]')).toBeVisible({
      timeout: 10000
    });

    // Create an alert notification with the message "Alert message"
    await createNotification(page, {
      severity: 'alert',
      message: 'Alert message'
    });

    // Wait for notification indicator to update to show count of 2
    await expect(page.locator('button[aria-label="Review 2 Notifications"]')).toBeVisible({
      timeout: 10000
    });

    // Click on button with aria-label "Review 2 Notifications"
    await page.locator('button[aria-label="Review 2 Notifications"]').click();

    // Wait for dialog to be visible and notifications to be loaded
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).toHaveCount(2, {
      timeout: 5000
    });

    // Verify both notifications are present before dismissing
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).toContainText(
      'Error message'
    );
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).toContainText(
      'Alert message'
    );

    // Click on button with aria-label="Dismiss notification of Error message"
    await page.locator('button[aria-label="Dismiss notification of Error message"]').click();

    // Wait for the error notification to be removed and only one notification remains
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).toHaveCount(1, {
      timeout: 5000
    });

    // Verify there is no notification with "Error message" since it was dismissed
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).not.toContainText(
      'Error message'
    );

    // Verify there is still a notification with "Alert message"
    await expect(page.locator('div[role="dialog"] div[role="listitem"]')).toContainText(
      'Alert message'
    );

    // Click on button with aria-label="Dismiss notification of Alert message"
    await page.locator('button[aria-label="Dismiss notification of Alert message"]').click();

    // Wait for dialog to be detached from DOM (accounts for animation)
    await expect(page.locator('div[role="dialog"]')).toBeHidden({ timeout: 2000 });
  });
});

test.describe('Notification Overlay', () => {
  test('Closing notification list after notification banner disappeared does not cause it to open automatically', async ({
    page
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/nasa/openmct/issues/6130'
    });

    // Go to baseURL
    await page.goto('./', { waitUntil: 'domcontentloaded' });

    // Create a new Display Layout object
    await createDomainObjectWithDefaults(page, { type: 'Display Layout' });

    // Wait for and click on the button "Review 1 Notification"
    await expect(page.locator('button[aria-label="Review 1 Notification"]')).toBeVisible({
      timeout: 10000
    });
    await page.locator('button[aria-label="Review 1 Notification"]').click();

    // Verify that Notification List is open
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Wait until there is no Notification Banner
    await expect(page.locator('div[role="alert"]')).toBeHidden({ timeout: 10000 });

    // Click on the "Close" button of the Notification List
    await page.locator('button[aria-label="Close"]').click();

    // On the Display Layout object, click on the "Edit" button
    await page.locator('button[title="Edit"]').click();

    // Click on the "Save" button
    await page.locator('button[title="Save"]').click();

    // Click on the "Save and Finish Editing" option
    await page.locator('li[title="Save and Finish Editing"]').click();

    // Verify that Notification List is NOT open
    await expect(page.locator('div[role="dialog"]')).toBeHidden();
  });
});
